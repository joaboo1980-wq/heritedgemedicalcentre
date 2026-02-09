# SMS Reminders - Quick Reference

## Files Overview

| File | Purpose |
|------|---------|
| `supabase/migrations/20260205_create_appointment_sms_logs.sql` | Database table for SMS tracking |
| `supabase/functions/send-appointment-reminder/index.ts` | On-demand SMS sending |
| `supabase/functions/schedule-appointment-reminders/index.ts` | Scheduled reminder cron function |
| `src/pages/Appointments.tsx` | Enhanced with auto-SMS on confirmation |
| `src/pages/DoctorDashboard.tsx` | Enhanced with auto-SMS on confirmation |

## Quick Setup (5 minutes)

```bash
# 1. Set Twilio secrets in Supabase
supabase secrets set TWILIO_ACCOUNT_SID "your_sid"
supabase secrets set TWILIO_AUTH_TOKEN "your_token"
supabase secrets set TWILIO_PHONE_NUMBER "+1XXXXXXXXXX"

# 2. Deploy functions
supabase functions deploy send-appointment-reminder --no-verify-jwt
supabase functions deploy schedule-appointment-reminders --no-verify-jwt

# 3. Run migration
supabase db push

# Done! SMS reminders are now active
```

## Environment Variables

### Required for Supabase Edge Functions
```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1XXXXXXXXXX
```

### Optional (for local testing)
Add to `.env` file in project root

## API Endpoints

### Send SMS Immediately
```bash
POST /functions/v1/send-appointment-reminder
Authorization: Bearer YOUR_ANON_KEY
Content-Type: application/json

{
  "phone": "+1234567890",
  "appointmentId": "uuid",
  "messageType": "confirmation",
  "appointmentDetails": {
    "patientName": "John Doe",
    "doctorName": "Dr. Smith",
    "date": "2026-02-10",
    "time": "14:30",
    "department": "Cardiology"
  }
}
```

### Schedule Reminders (24-hour)
```bash
POST /functions/v1/schedule-appointment-reminders
Authorization: Bearer YOUR_ANON_KEY
Content-Type: application/json

{
  "reminder_hours": 24,
  "reminder_type": "reminder_24h"
}
```

### Schedule Reminders (1-hour)
```bash
POST /functions/v1/schedule-appointment-reminders
Authorization: Bearer YOUR_ANON_KEY
Content-Type: application/json

{
  "reminder_hours": 1,
  "reminder_type": "reminder_1h"
}
```

## Message Types

| Type | Trigger | Message |
|------|---------|---------|
| `confirmation` | Appointment confirmed | "Appointment Confirmed! Dr. [Name] on [Date] at [Time]..." |
| `reminder_24h` | 24 hours before | "Reminder: Your appointment with Dr. [Name] is tomorrow at [Time]..." |
| `reminder_1h` | 1 hour before | "Reminder: Your appointment with Dr. [Name] is in 1 hour at [Time]..." |
| `cancellation` | Appointment cancelled | "Your appointment with Dr. [Name] on [Date] at [Time] has been cancelled..." |
| `reschedule` | Appointment rescheduled | "Your appointment has been rescheduled to [Date] at [Time]..." |

## Common SQL Queries

### View recent SMS logs
```sql
SELECT * FROM appointment_sms_logs
ORDER BY created_at DESC
LIMIT 20;
```

### View failed SMS
```sql
SELECT * FROM appointment_sms_logs
WHERE status = 'failed'
ORDER BY created_at DESC;
```

### SMS sent today
```sql
SELECT COUNT(*) as today_count FROM appointment_sms_logs
WHERE DATE(created_at) = TODAY()
AND status = 'sent';
```

### SMS for specific appointment
```sql
SELECT * FROM appointment_sms_logs
WHERE appointment_id = 'YOUR_UUID'
ORDER BY created_at DESC;
```

### SMS by patient
```sql
SELECT * FROM appointment_sms_logs
WHERE patient_id = 'YOUR_UUID'
ORDER BY created_at DESC;
```

## Frontend Integration

### Auto-send on confirmation (Already implemented)
```typescript
// In updateStatusMutation
if (status === 'confirmed') {
  // SMS automatically sent to patient
}
```

### Manual SMS send button (Already in UI)
```typescript
<Button onClick={() => 
  sendSmsReminderMutation.mutate({
    appointmentId: apt.id,
    patientId: apt.patient_id,
  })
}>
  <MessageSquare className="h-4 w-4" />
</Button>
```

## Cron Job Setup Examples

### GitHub Actions (Free)
```yaml
# .github/workflows/sms-reminders.yml
name: Send SMS Reminders
on:
  schedule:
    - cron: '0 9 * * *'  # Daily at 9 AM UTC

jobs:
  send-reminders:
    runs-on: ubuntu-latest
    steps:
      - name: Send 24-hour reminders
        run: |
          curl -X POST ${{ secrets.SUPABASE_URL }}/functions/v1/schedule-appointment-reminders \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}" \
            -H "Content-Type: application/json" \
            -d '{"reminder_hours": 24, "reminder_type": "reminder_24h"}'
```

### EasyCron (Free online)
1. Go to [easycron.com](https://www.easycron.com)
2. Add new cron job
3. URL: `https://your-supabase-url/functions/v1/schedule-appointment-reminders`
4. POST body: `{"reminder_hours": 24, "reminder_type": "reminder_24h"}`
5. Set schedule: Daily at 9 AM

## Troubleshooting Commands

### Test function directly
```bash
supabase functions logs send-appointment-reminder

# Or via curl
curl -X POST http://localhost:54321/functions/v1/send-appointment-reminder \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+1234567890",
    "appointmentId": "test",
    "messageType": "confirmation",
    "appointmentDetails": {}
  }'
```

### Check SMS logs
```bash
# Via Supabase CLI
supabase query "SELECT * FROM appointment_sms_logs ORDER BY created_at DESC LIMIT 10;"

# Via dashboard
# Go to Supabase → SQL Editor → Run custom query
```

### Verify secrets are set
```bash
supabase secrets list
```

## Status Codes

| Code | Meaning |
|------|---------|
| 200 | SMS sent successfully |
| 400 | Missing required fields |
| 405 | Wrong HTTP method |
| 500 | Internal server error |

## Response Examples

### Success
```json
{
  "success": true,
  "message": "SMS sent successfully",
  "messageSid": "SM1234567890abcdef"
}
```

### Failure
```json
{
  "success": false,
  "error": "Invalid phone number format",
  "message": "SMS sending failed but was logged"
}
```

## Performance Tips

1. **Batch Processing**: 100ms delay between SMS to prevent rate limiting
2. **Deduplication**: System prevents duplicate scheduled reminders automatically
3. **Caching**: Doctor/patient data cached in single query
4. **Indexing**: SMS logs table has indexes on key fields

## Cost Estimate (Twilio)

- Outbound SMS: $0.0075 per message (US)
- Monthly estimate (1000 appointments): ~$7.50
- Trial account: $15.50 free credits

## Monitoring Best Practices

1. ✅ Check SMS logs daily
2. ✅ Monitor Twilio account costs
3. ✅ Test send on Monday mornings
4. ✅ Review failed messages weekly
5. ✅ Update patient phone numbers regularly

## Phone Number Format Examples

| Format | Valid? | Notes |
|--------|--------|-------|
| +1234567890 | ✅ | Correct (E.164) |
| +1-234-567-8900 | ✅ | Twilio accepts this |
| 1234567890 | ❌ | Missing + and country code |
| (123) 456-7890 | ❌ | Not E.164 format |
| +44-20-1234-5678 | ✅ | International OK |

## Links

- [SMS_REMINDERS_SETUP.md](SMS_REMINDERS_SETUP.md) - Full setup guide
- [SMS_IMPLEMENTATION_GUIDE.md](SMS_IMPLEMENTATION_GUIDE.md) - Complete documentation
- [Twilio Docs](https://www.twilio.com/docs)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)

---

**Last Updated**: February 5, 2026
