# SMS Reminders - Testing Guide

**Date**: February 5, 2026  
**Purpose**: Comprehensive testing procedures for SMS reminder system

---

## 📋 Pre-Test Checklist

- [ ] Twilio account created
- [ ] Account SID obtained
- [ ] Auth Token obtained
- [ ] Twilio phone number obtained (format: +1XXXXXXXXXX)
- [ ] Environment variables set in Supabase secrets
- [ ] Both Edge Functions deployed (`send-appointment-reminder` and `schedule-appointment-reminders`)
- [ ] Database migration applied (`supabase db push`)
- [ ] At least one patient in database with phone number
- [ ] At least one doctor in database

---

## 🧪 Test 1: Verify Supabase Setup

### Objective
Ensure Twilio credentials are accessible to Edge Functions

### Steps

1. **Check Secrets Are Set**
   ```bash
   supabase secrets list
   ```
   
   Expected output should show:
   ```
   TWILIO_ACCOUNT_SID
   TWILIO_AUTH_TOKEN
   TWILIO_PHONE_NUMBER
   ```

2. **Check Migration Applied**
   ```bash
   # In Supabase Dashboard → SQL Editor
   SELECT * FROM information_schema.tables 
   WHERE table_name = 'appointment_sms_logs';
   ```
   
   Should return one row showing the table exists

3. **Check RLS Policies**
   ```sql
   SELECT * FROM pg_policies 
   WHERE tablename = 'appointment_sms_logs';
   ```
   
   Should show 3 policies: select, insert, update

### ✅ Test Passes If
- All three secrets listed
- `appointment_sms_logs` table exists
- All RLS policies created

---

## 🧪 Test 2: Manual SMS Send from UI

### Objective
Test on-demand SMS sending from Appointments page

### Prerequisites
- Patient with valid phone number in E.164 format (+1XXXXXXXXXX)
- Scheduled appointment
- At least one doctor

### Steps

1. Navigate to **Appointments** page
2. Find an appointment in the table
3. Click the **message icon (💬)** button
4. Observe toast notification (should say "Reminder SMS sent successfully" or error)
5. Check Supabase SMS logs:
   ```sql
   SELECT * FROM appointment_sms_logs
   ORDER BY created_at DESC
   LIMIT 1;
   ```

### ✅ Test Passes If
- Toast shows success message
- SMS log entry created with:
  - `status = 'sent'`
  - `twilio_message_sid` is populated (not null)
  - `message_type = 'confirmation'`
  - Phone number matches patient
  - Message includes doctor name, date, time

### ❌ Common Failures

**Toast shows "Patient phone number not found"**
- Solution: Verify patient has phone number in database

**Toast shows error but no log entry**
- Problem: RLS policy blocking inserts
- Solution: Check RLS policies on `appointment_sms_logs`

**Log shows `status = 'failed'`**
- Check `error_message` field for details
- Common: "Twilio credentials not configured" → Verify secrets
- Common: "Invalid phone number format" → Use +1XXXXXXXXXX

---

## 🧪 Test 3: Auto-Send SMS on Confirmation

### Objective
Test automatic SMS sending when appointment status changes to "confirmed"

### Prerequisites
- Appointment with status "scheduled"
- Patient with valid phone
- Working manual SMS (Test 2)

### Steps

#### Via Appointments Page
1. Navigate to **Appointments** page
2. Find a "scheduled" appointment
3. Click status dropdown → select **"Confirmed"**
4. Observe toast notification
5. Check SMS logs for new entry

#### Via DoctorDashboard
1. Navigate to **Doctor Dashboard** (if logged in as doctor)
2. Find appointment in "Today's Appointments"
3. Click **"Confirm"** button
4. Observe success toast: "Appointment confirmed and SMS sent to patient"
5. Check SMS logs

### ✅ Test Passes If
- Toast shows success
- New SMS log entry created:
  - `message_type = 'confirmation'`
  - `status = 'sent'`
  - `twilio_message_sid` populated

### ⚠️ Expected Behavior
- If SMS fails (wrong phone, etc.), appointment still confirms
- Toast will show: "Appointment confirmed. SMS sending had an issue"
- SMS log will show `status = 'failed'` with error message

---

## 🧪 Test 4: SMS Log Tracking

### Objective
Verify SMS logs are created and queryable

### Steps

1. **Query All Recent SMS**
   ```sql
   SELECT id, phone_number, message_type, status, created_at
   FROM appointment_sms_logs
   ORDER BY created_at DESC
   LIMIT 10;
   ```

2. **Query Sent SMS**
   ```sql
   SELECT COUNT(*) as sent_count
   FROM appointment_sms_logs
   WHERE status = 'sent';
   ```

3. **Query Failed SMS**
   ```sql
   SELECT phone_number, error_message, created_at
   FROM appointment_sms_logs
   WHERE status = 'failed'
   ORDER BY created_at DESC;
   ```

4. **Query by Appointment**
   ```sql
   SELECT * FROM appointment_sms_logs
   WHERE appointment_id = 'YOUR_APPOINTMENT_UUID'
   ORDER BY created_at DESC;
   ```

5. **Check Message Types**
   ```sql
   SELECT DISTINCT message_type, COUNT(*) as count
   FROM appointment_sms_logs
   GROUP BY message_type;
   ```

### ✅ Test Passes If
- All queries return results
- Message types are in expected list (confirmation, reminder_24h, etc.)
- Status values are only: pending, sent, failed, bounced
- Twilio SIDs are populated for sent messages
- Error messages show for failed messages

---

## 🧪 Test 5: Edge Function Direct Call

### Objective
Test Edge Function API directly via curl

### Prerequisites
- Supabase project URL
- Anon key from Supabase
- Valid phone number in E.164 format

### Steps

```bash
# Set variables
SUPABASE_URL="https://your-project.supabase.co"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
PHONE="+1234567890"
APPT_ID="your-appointment-uuid"

# Send SMS via curl
curl -X POST $SUPABASE_URL/functions/v1/send-appointment-reminder \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "'$PHONE'",
    "appointmentId": "'$APPT_ID'",
    "messageType": "confirmation",
    "appointmentDetails": {
      "patientName": "John Doe",
      "doctorName": "Dr. Smith",
      "date": "2026-02-15",
      "time": "14:30",
      "department": "Cardiology"
    }
  }' | jq .
```

### ✅ Test Passes If
Response is:
```json
{
  "success": true,
  "message": "SMS sent successfully",
  "messageSid": "SMxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
}
```

### ❌ Common Response Codes

| Code | Response | Fix |
|------|----------|-----|
| 200 | `success: true` | Working! |
| 400 | Missing fields | Add phone and appointmentId |
| 405 | Method not allowed | Use POST not GET |
| 500 | "credentials not configured" | Secrets not set in Supabase |
| 500 | "Invalid phone number" | Use E.164 format: +1XXXXXXXXXX |

---

## 🧪 Test 6: Scheduled Reminders Setup

### Objective
Test scheduled reminder function (for cron jobs)

### Prerequisites
- At least one appointment confirmed for today or tomorrow
- Scheduled reminder function deployed

### Step 1: Test 24-Hour Reminder

```bash
curl -X POST https://your-supabase.functions.supabase.co/schedule-appointment-reminders \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"reminder_hours": 24, "reminder_type": "reminder_24h"}'
```

Expected response:
```json
{
  "success": true,
  "reminders_sent": 1,
  "reminders_failed": 0
}
```

### Step 2: Check SMS Logs

```sql
SELECT * FROM appointment_sms_logs
WHERE message_type = 'reminder_24h'
ORDER BY created_at DESC
LIMIT 5;
```

### Step 3: Test 1-Hour Reminder

```bash
curl -X POST https://your-supabase.functions.supabase.co/schedule-appointment-reminders \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"reminder_hours": 1, "reminder_type": "reminder_1h"}'
```

### ✅ Test Passes If
- Response shows reminders sent
- SMS logs created with correct message_type
- No duplicate reminders sent (system prevents this)
- Status is 'sent' not 'failed'

---

## 🧪 Test 7: Error Handling

### Objective
Verify system gracefully handles errors

### Test 7A: Invalid Phone Number

1. Update test patient phone to invalid format:
   ```sql
   UPDATE public.patients
   SET phone = 'invalid'
   WHERE id = 'YOUR_PATIENT_ID';
   ```

2. Try sending SMS via UI
3. Check SMS logs - should show `status = 'failed'` with error message

Expected error message: "Invalid phone number format"

### Test 7B: Missing Appointment

```bash
curl -X POST $SUPABASE_URL/functions/v1/send-appointment-reminder \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+1234567890",
    "appointmentId": "nonexistent-uuid"
  }'
```

Expected: Still returns 200 (logs error but doesn't crash)

### Test 7C: Missing Phone Number

1. Update patient to remove phone:
   ```sql
   UPDATE public.patients
   SET phone = NULL
   WHERE id = 'YOUR_PATIENT_ID';
   ```

2. Try manual SMS send
3. Should show toast error: "Patient phone number not found"

### ✅ Test Passes If
- No function crashes
- Errors logged to `appointment_sms_logs` table
- User sees appropriate error messages
- System continues functioning

---

## 🧪 Test 8: Performance & Load

### Objective
Verify system handles multiple SMS sends

### Steps

1. **Send 10 SMS Rapidly**
   ```bash
   for i in {1..10}; do
     curl -X POST $SUPABASE_URL/functions/v1/send-appointment-reminder \
       -H "Authorization: Bearer $ANON_KEY" \
       -H "Content-Type: application/json" \
       -d '{"phone": "+1234567890", "appointmentId": "test'$i'"}' &
   done
   wait
   ```

2. **Count logs created**
   ```sql
   SELECT COUNT(*) FROM appointment_sms_logs
   WHERE created_at > NOW() - INTERVAL '1 minute';
   ```

3. **Check for timeouts** - Should be 0
4. **Check response times** - Should be < 2 seconds each

### ✅ Test Passes If
- All 10 requests complete
- All 10 logged (even if some failed)
- No timeout errors
- System remains responsive

---

## 🧪 Test 9: Data Integrity

### Objective
Verify data consistency in SMS logs

### Steps

```sql
-- Check for orphaned logs (appointment deleted but log exists)
SELECT sms.id, sms.appointment_id 
FROM appointment_sms_logs sms
LEFT JOIN appointments a ON sms.appointment_id = a.id
WHERE a.id IS NULL;
-- Should return empty result

-- Check for invalid status values
SELECT DISTINCT status FROM appointment_sms_logs;
-- Should only return: pending, sent, failed, bounced

-- Check for missing timestamps on sent SMS
SELECT id FROM appointment_sms_logs
WHERE status = 'sent' AND sent_at IS NULL;
-- Should return empty result

-- Check for duplicate Twilio SIDs
SELECT twilio_message_sid, COUNT(*) as count
FROM appointment_sms_logs
WHERE twilio_message_sid IS NOT NULL
GROUP BY twilio_message_sid
HAVING COUNT(*) > 1;
-- Should return empty result (UNIQUE constraint)

-- Check message type validity
SELECT DISTINCT message_type FROM appointment_sms_logs;
-- Should only contain: confirmation, reminder_24h, reminder_1h, cancellation, reschedule
```

### ✅ Test Passes If
- All queries return expected empty or valid results
- No orphaned records
- No invalid status values
- All sent SMS have timestamps
- No duplicate SIDs
- Message types in expected list

---

## 📊 Test Results Summary

### Checklist

- [ ] Test 1: Supabase Setup - PASSED
- [ ] Test 2: Manual SMS Send - PASSED
- [ ] Test 3: Auto-Send on Confirmation - PASSED
- [ ] Test 4: SMS Log Tracking - PASSED
- [ ] Test 5: Direct API Call - PASSED
- [ ] Test 6: Scheduled Reminders - PASSED
- [ ] Test 7: Error Handling - PASSED
- [ ] Test 8: Performance & Load - PASSED
- [ ] Test 9: Data Integrity - PASSED

### Sign-Off

- **Tested By**: _________________________
- **Date**: _________________________
- **Environment**: DEV / STAGING / PRODUCTION
- **Status**: ✅ APPROVED FOR PRODUCTION

---

## 🚨 Troubleshooting During Tests

### "Function not found" Error
- Verify functions deployed: `supabase functions ls`
- Check function names match exactly
- Try redeploying: `supabase functions deploy send-appointment-reminder`

### "Twilio credentials not configured"
- List secrets: `supabase secrets list`
- Verify all three secrets present
- Re-set secrets if missing

### "Permission denied" on database operations
- Check RLS policies on `appointment_sms_logs` table
- Verify service role key being used for Edge Functions
- Check table has `ENABLE ROW LEVEL SECURITY`

### "No results returned" on queries
- Verify migration ran: `supabase db push`
- Check table exists: `\dt appointment_sms_logs` in SQL editor
- Verify records inserted before querying

---

## 📞 Support

If tests fail:

1. Check SMS_REMINDERS_SETUP.md for setup verification
2. Review Supabase function logs: `supabase functions logs send-appointment-reminder`
3. Check Twilio dashboard for account status/credits
4. Verify patient phone numbers are valid
5. Check network connectivity to Twilio API
6. Review database RLS policies and constraints

---

**Test Version**: 1.0  
**Last Updated**: February 5, 2026
