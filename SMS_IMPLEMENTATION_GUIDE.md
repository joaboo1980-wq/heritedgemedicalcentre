# SMS Reminders Implementation Guide

## Overview

Your healthcare system now has a complete SMS reminder system for patient appointments using Twilio and Supabase. This guide covers what was implemented, how to use it, and troubleshooting.

## What's Implemented

### ✅ Core Features

1. **Automatic SMS on Appointment Confirmation**
   - When a doctor confirms an appointment via DoctorDashboard or a staff member confirms via Appointments page
   - SMS automatically sent to patient with appointment details
   - Message includes: Doctor name, appointment date, time, and department

2. **On-Demand SMS Sending**
   - Manual SMS send button in Appointments table (message icon)
   - Allows staff to send reminders anytime
   - Useful for follow-ups or manual confirmations

3. **SMS Tracking & Logging**
   - All SMS messages logged to `appointment_sms_logs` table
   - Tracks: phone number, message type, Twilio SID, status, errors
   - View sent/failed messages in database
   - Troubleshooting via logs

4. **Scheduled Reminders**
   - 24-hour appointment reminders
   - 1-hour appointment reminders
   - Configurable via cron jobs or scheduled tasks

5. **Multiple Message Types**
   - **confirmation**: Sent when appointment is confirmed
   - **reminder_24h**: 24 hours before appointment
   - **reminder_1h**: 1 hour before appointment
   - **cancellation**: When appointment is cancelled
   - **reschedule**: When appointment is rescheduled

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                        │
│  ┌─────────────┐  ┌──────────────────┐  ┌─────────────────┐│
│  │ Appointments│  │ DoctorDashboard  │  │ ReceptionDesk   ││
│  │ Page        │  │                  │  │                 ││
│  └──────┬──────┘  └────────┬─────────┘  └────────┬────────┘│
│         │                  │                     │           │
│         └──────────────────┼─────────────────────┘           │
│                            │                                 │
│              updateStatusMutation.mutate()                   │
│              (status = 'confirmed')                          │
│                            │                                 │
└────────────────────────────┼─────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │ Supabase Edge   │
                    │ Functions       │
                    └────────┬────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
    ┌────▼─────────┐    ┌───▼────────────┐  ┌──▼──────┐
    │send-appt-    │    │schedule-appt-  │  │Supabase │
    │reminder      │    │reminders       │  │Database │
    │(on-demand)   │    │(scheduled)     │  │         │
    └────┬─────────┘    └───┬────────────┘  └──▲──────┘
         │                  │                  │
         └──────────────────┼──────────────────┘
                            │
                    ┌───────▼─────────┐
                    │ Twilio API      │
                    │ (SMS Gateway)   │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │ Patient Phone   │
                    │ (SMS Received)  │
                    └─────────────────┘
```

## Files Created/Modified

### New Files

1. **supabase/migrations/20260205_create_appointment_sms_logs.sql**
   - Creates `appointment_sms_logs` table
   - Indexes for performance
   - RLS policies for security
   - Auto-update timestamp trigger

2. **supabase/functions/send-appointment-reminder/index.ts**
   - Deno/Edge Function for sending SMS via Twilio
   - Handles: confirmation, reminders, cancellation, reschedule messages
   - Logs all attempts to database
   - Runs on-demand from frontend

3. **supabase/functions/schedule-appointment-reminders/index.ts**
   - Scheduled reminder function
   - Runs via cron jobs for 24h and 1h reminders
   - Prevents duplicate reminders
   - Batch sends reminders

4. **SMS_REMINDERS_SETUP.md**
   - Complete setup guide
   - Twilio account configuration
   - Environment variables
   - Testing procedures

### Modified Files

1. **src/pages/Appointments.tsx**
   - Enhanced `updateStatusMutation` to auto-send SMS on confirmation
   - Improved `sendSmsReminderMutation` with appointment details
   - Manual SMS send button already in UI

2. **src/pages/DoctorDashboard.tsx**
   - Enhanced `confirmAppointmentMutation` to auto-send SMS
   - Includes patient and doctor details in message
   - Non-critical SMS errors don't block appointment confirmation

## Database Schema

### appointment_sms_logs Table

```sql
id                  UUID PRIMARY KEY
appointment_id      UUID (FK to appointments)
patient_id          UUID (FK to patients)
phone_number        TEXT
message_type        TEXT (confirmation|reminder_24h|reminder_1h|cancellation|reschedule)
message_content     TEXT
twilio_message_sid  TEXT UNIQUE (Twilio's ID)
status              TEXT (pending|sent|failed|bounced)
error_message       TEXT (if failed)
sent_at             TIMESTAMP
created_at          TIMESTAMP
updated_at          TIMESTAMP
```

## Setup Instructions

### 1. Get Twilio Credentials

1. Sign up at [twilio.com](https://www.twilio.com)
2. Get your **Account SID** from dashboard
3. Get your **Auth Token** from dashboard
4. Provision a **Phone Number**

### 2. Set Environment Variables

#### Local Development (.env)

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1XXXXXXXXXX
```

#### Supabase Secrets

```bash
supabase secrets set TWILIO_ACCOUNT_SID "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
supabase secrets set TWILIO_AUTH_TOKEN "your_auth_token_here"
supabase secrets set TWILIO_PHONE_NUMBER "+1XXXXXXXXXX"
```

### 3. Deploy Functions & Migration

```bash
# Deploy Edge Functions
supabase functions deploy send-appointment-reminder --no-verify-jwt
supabase functions deploy schedule-appointment-reminders --no-verify-jwt

# Push database migration
supabase db push
```

### 4. Test It

1. Go to Appointments page
2. Create a test appointment
3. Click "Confirm" status - SMS should auto-send
4. Check `appointment_sms_logs` table for logs

## Usage

### Auto-Send SMS on Confirmation

**Trigger Points:**
- DoctorDashboard: Click "Confirm" button on appointment
- Appointments page: Change status to "confirmed" in dropdown
- ReceptionDashboard: Any confirmation via status update

**Message Content:**
```
Appointment Confirmed! Dr. [Doctor Name] on [Date] at [Time] ([Department]). Reply STOP to unsubscribe.
```

### Manual SMS Send

**From Appointments Page:**
1. Find appointment in table
2. Click message icon (💬)
3. SMS sent immediately
4. Toast notification shows success/failure

### Scheduled Reminders

**Setup 24-hour reminder (runs at 9 AM UTC daily):**
```bash
# Using cron-job.org or similar
curl -X POST https://your-supabase-url/functions/v1/schedule-appointment-reminders \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"reminder_hours": 24, "reminder_type": "reminder_24h"}'
```

**Setup 1-hour reminder (runs every hour):**
```bash
curl -X POST https://your-supabase-url/functions/v1/schedule-appointment-reminders \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"reminder_hours": 1, "reminder_type": "reminder_1h"}'
```

## Monitoring

### View SMS Logs

**In Supabase Dashboard:**
```sql
SELECT * FROM appointment_sms_logs
WHERE created_at > NOW() - INTERVAL '1 day'
ORDER BY created_at DESC;
```

**Find failed messages:**
```sql
SELECT * FROM appointment_sms_logs
WHERE status = 'failed'
ORDER BY created_at DESC;
```

**Track specific appointment:**
```sql
SELECT * FROM appointment_sms_logs
WHERE appointment_id = 'YOUR_APPOINTMENT_ID'
ORDER BY created_at DESC;
```

## Troubleshooting

### SMS Not Sending

**Problem: "Twilio credentials not configured"**
- Solution: Add `TWILIO_*` environment variables to Supabase secrets

**Problem: "Invalid phone number format"**
- Solution: Phone must be in E.164 format (+1XXXXXXXXXX)
- Example: +1234567890 ✓, 123-456-7890 ✗

**Problem: "No SMS logs created"**
- Solution: Check if migration ran (`supabase db push`)
- Verify RLS policies allow inserts from Edge Functions

**Problem: SMS sent but patient didn't receive**
- Causes:
  - Twilio trial account (limited to verified numbers)
  - Phone number not verified in Twilio
  - Patient opted out with STOP
  - Message contained blocked content

### Debugging

**Enable logging in functions:**
```bash
# Check function logs
supabase functions logs send-appointment-reminder
```

**Test manually:**
```bash
# Send test SMS
curl -X POST https://your-supabase-url/functions/v1/send-appointment-reminder \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+1234567890",
    "appointmentId": "test-id",
    "messageType": "confirmation",
    "appointmentDetails": {
      "doctorName": "Dr. Smith",
      "date": "2026-02-10",
      "time": "14:30"
    }
  }'
```

## Best Practices

### 1. Verify Phone Numbers

Always validate patient phone numbers in E.164 format:
```sql
UPDATE public.patients
SET phone = '+1' || REGEXP_REPLACE(phone, '[^0-9]', '', 'g')
WHERE phone IS NOT NULL;
```

### 2. Prevent Duplicate SMS

The system checks for existing sent SMS before sending scheduled reminders. For on-demand sends, be mindful of sending duplicates.

### 3. Monitor Costs

Twilio charges per SMS sent. Monitor usage:
- Twilio Dashboard → Usage → Messaging
- Set billing alerts
- Review `appointment_sms_logs` for sent count

### 4. Handle Opt-Outs

Add patient opt-out tracking:
```sql
ALTER TABLE public.patients
ADD COLUMN sms_opted_out BOOLEAN DEFAULT false;

-- In send function, skip if opted out:
-- if (patient.sms_opted_out) return { success: false };
```

### 5. Rate Limiting

For high-volume sends, consider adding delays:
```typescript
// Add 100ms delay between messages to prevent rate limits
await new Promise(resolve => setTimeout(resolve, 100));
```

## Testing Checklist

- [ ] Twilio account created
- [ ] Phone number provisioned
- [ ] Environment variables set in Supabase
- [ ] Edge Functions deployed
- [ ] Database migration applied
- [ ] Test SMS sends from manual button
- [ ] Test auto-SMS on confirmation
- [ ] View logs in `appointment_sms_logs` table
- [ ] Set up scheduled reminder cron jobs
- [ ] Monitor first 24 hours of production use

## Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Mutation fails silently | RLS policy blocking inserts | Check `appointment_sms_logs` RLS policies |
| SMS sent but wrong number | Phone format issue | Use E.164: +1XXXXXXXXXX |
| Function timeout | Too many API calls | Increase Supabase function timeout |
| Double SMS sent | Both auto and manual triggered | Add debounce to UI button |
| No logs appearing | Migration not ran | Run `supabase db push` |
| Toast shows success but no SMS | Twilio account issue | Check Twilio dashboard logs |

## Future Enhancements

Consider adding:

1. **SMS Replies**
   - Allow patients to reply to confirm/cancel
   - Webhook from Twilio to handle replies

2. **WhatsApp Integration**
   - Send via WhatsApp instead of SMS
   - Twilio supports WhatsApp Business API

3. **Email Backup**
   - Send email if SMS fails
   - Fallback notification method

4. **Appointment Confirmation via SMS**
   - Patient responds YES/NO to SMS
   - Automatic confirmation tracking

5. **SMS Templates**
   - Database table for customizable templates
   - Admin panel to edit messages

6. **Analytics Dashboard**
   - SMS delivery rates
   - Cost tracking
   - Patient engagement metrics

## Support

For issues or questions:
1. Check SMS logs: `SELECT * FROM appointment_sms_logs`
2. Review Twilio dashboard
3. Check Edge Function logs
4. Enable debug logging in functions
5. Contact Twilio support if SMS not delivering

---

**Version**: 1.0
**Last Updated**: February 5, 2026
**Status**: Production Ready
