# Medication Scheduling & Audit Trail System

## Overview

This system implements **automatic medication scheduling, time-based reminders, and comprehensive audit trails** for the nursing dashboard. It replaces manual medication tracking with an intelligent scheduling system that:

1. **Automatically generates medication schedules** from prescriptions
2. **Displays time-triggered medication reminders** for nurses
3. **Records complete audit trails** of all medication administrations
4. **Prevents medication errors** through automated status management

---

## Features Implemented

### 1. **Automatic Medication Scheduling**

**Database Table:** `scheduled_doses`

When a prescription is marked as "dispensed" or "pending", the system automatically:
- Parses the medication frequency (OD, BD, TDS, QID, every 6/8/12 hours, etc.)
- Generates scheduled dose records for the next 30 days
- Assigns appropriate times based on frequency patterns (6 AM, 12 PM, 6 PM, 10 PM)

```sql
-- Trigger: prescription_auto_generate_doses
-- When: After prescription INSERT or UPDATE
-- Action: Calls generate_scheduled_doses_for_prescription() function
```

**Frequency Parsing Logic:**
- `OD` (once daily) → 1 dose at 6:00 AM
- `BD` (twice daily) → 2 doses at 6:00 AM, 6:00 PM
- `TDS` (three times daily) → 3 doses at 6:00 AM, 12:00 PM, 6:00 PM
- `QID` (four times daily) → 4 doses at 6:00 AM, 12:00 PM, 6:00 PM, 10:00 PM
- `Every 6 hours` → 4 doses per day
- `Every 8 hours` → 3 doses per day
- `Every 12 hours` → 2 doses per day
- `PRN` (as needed) → Manual entry only

**Schema: scheduled_doses**
```typescript
{
  id: UUID
  prescription_item_id: UUID
  prescription_id: UUID
  patient_id: UUID
  scheduled_time: TIMESTAMP       // When dose should be given
  dosage: VARCHAR(100)
  frequency: VARCHAR(100)
  route: VARCHAR(50)              // oral, IV, IM, topical, etc.
  status: 'pending'|'due'|'administered'|'skipped'|'cancelled'
  administered_at: TIMESTAMP | null
  administered_by_id: UUID | null // Nurse who administered
  notes: TEXT
  created_at: TIMESTAMP
  updated_at: TIMESTAMP
}
```

### 2. **Time-Based Medication Reminders**

**Component:** `MedicationScheduleWidget`

Displays medications that are:
- **Overdue** - Scheduled time has passed (red highlight)
- **Due Soon** - Within the next hour (yellow highlight)

**Features:**
- Real-time updates every 2 minutes
- Single click to record administration
- Dropdown menu for quick actions (Record/Skip)
- Shows medication name, dosage, and scheduled time
- Displays time since dose was due

**Hook:** `useDueMedications(patientId?)`
```typescript
const { data: dueMeds } = useDueMedications(patientId);
// Fetches doses with status 'due' or 'pending'
// Auto-refetches every 2 minutes
```

**Status Flow:**
```
pending (scheduled_time in future)
    ↓
due (within 1 hour of scheduled_time)
    ↓
administered (nurse records administration)
    OR
skipped (nurse chooses to skip with reason)
```

### 3. **Medication Administration Audit Trail**

**Database Table:** `medication_administration_log`

Records complete history of every medication administration event:

**Schema:**
```typescript
{
  id: UUID
  prescription_item_id: UUID
  patient_id: UUID
  administered_by_id: UUID          // Nurse ID
  administered_at: TIMESTAMP         // Exact time recorded
  dosage_given: VARCHAR(100)        // Actual dosage given
  route: VARCHAR(50)                // Route used
  notes: TEXT                       // Observations/side effects
  status: 'administered'|'skipped'|'refused'|'delayed'
  reason_if_skipped: TEXT          // Why medication was skipped
  created_at: TIMESTAMP
}
```

**Component:** `MedicationAuditTrail`

Displays comprehensive medication history with:
- **Statistics Cards:** Total, Administered, Skipped, Refused, Delayed
- **Filtering:** By medication name, status, time period (7/30/90 days)
- **Sortable Table:** Shows all administrations in chronological order
- **Details:** Includes nurse name, exact time, dosage, route, notes

---

## Recording Medication Administration

### Dialog Flow

**1. Nurse clicks "Record Administration"**
```
MedicationScheduleWidget
    ↓
selectedDose = ScheduledDose
showAdminDialog = true
```

**2. Dialog shows:**
- Scheduled dose details
- Input: Dosage Given (pre-filled with scheduled dosage)
- Dropdown: Route (oral, IV, IM, subcutaneous, topical, inhaled)
- Textarea: Notes (observations, side effects)

**3. Backend flow on Submit:**
```
1. Get current user ID (nurse)
2. Call: record_medication_administration() RPC function
   - Inserts into medication_administration_log
   - Updates scheduled_doses record
     - status = 'administered'
     - administered_at = now()
     - administered_by_id = nurse_id
3. Invalidate React Query caches:
   - scheduled-doses
   - due-medications
   - medication-audit-log
4. Show success toast
```

**Hook:** `useRecordMedicationAdministration()`
```typescript
await recordAdminMutation.mutateAsync({
  scheduledDoseId: dose.id,
  dosageGiven: '500mg',
  route: 'oral',
  notes: 'Patient alert, no side effects observed'
});
```

---

## Automated Status Updates

### Status Calculation

The system automatically determines medication status without manual intervention:

**At Query Time:**
```sql
-- When fetching scheduled_doses, calculate status based on:
CASE 
  WHEN status = 'administered' THEN 'administered'
  WHEN status = 'skipped' THEN 'skipped'
  WHEN scheduled_time <= now() 
    AND scheduled_time > now() - '1 hour'::INTERVAL 
    AND status = 'pending' THEN 'due'
  WHEN scheduled_time > now() 
    AND status = 'pending' THEN 'pending'
  ELSE status
END
```

**On Timer Basis:**
```
Function: update_due_doses()
Trigger: Can be called manually or via scheduled job
Effect: Sets status = 'due' for doses within 1-hour window
```

### No Manual Status Updates Required

Once a dose is:
- ✅ Administered → System records it automatically with timestamp
- ⏭️ Skipped → Nurse provides reason, system marks it
- ⏰ Due → System calculates automatically based on time

---

## Database Relationships

```
prescriptions
    ↓ (1:N)
prescription_items
    ↓ (1:N)
scheduled_doses ← (auto-generated)
    ↓ (1:1)
medication_administration_log ← (on record)
    ↓
medications (master data)
```

---

## RLS Policies

### medication_administration_log

| Policy | Role | Action | Condition |
|--------|------|--------|-----------|
| `admins_view_all_admin_logs` | admin | SELECT | All logs |
| `nurses_view_own_admin_logs` | nurse | SELECT | Own administrations |
| `nurses_insert_admin_logs` | nurse | INSERT | Must be nurse role |

### scheduled_doses

| Policy | Role | Action | Condition |
|--------|------|--------|-----------|
| `admins_view_all_doses` | admin | SELECT | All doses |
| `nurses_view_assigned_doses` | nurse | SELECT | Assigned patients only |
| `nurses_update_doses` | nurse | UPDATE | Assigned patients only |

---

## React Query Hooks

### Fetching Data

**`useDueMedications(patientId?)`**
- Returns: Medications that need to be given now or soon
- Refetches: Every 2 minutes
- Used by: MedicationScheduleWidget

**`useScheduledDoses(filters?)`**
- Returns: All scheduled doses with filters
- Filters: patientId, status, dateRange
- Used by: Audit trail, reports

**`usePatientMedicationHistory(patientId)`**
- Returns: Administered and skipped doses for a patient
- Filters: Only administered/skipped status
- Used by: Patient history view

**`useMedicationAuditLog(filters?)`**
- Returns: Complete audit trail with details
- Filters: patientId, administeredById, dateRange
- Includes: User info, medication details, patient info

### Recording Data

**`useRecordMedicationAdministration()`**
```typescript
await mutation.mutateAsync({
  scheduledDoseId: string,
  dosageGiven: string,
  route: string,
  notes?: string
});
```

**`useSkipScheduledDose()`**
```typescript
await mutation.mutateAsync({
  scheduledDoseId: string,
  reason: string
});
```

**`useGenerateScheduledDoses()`**
```typescript
await mutation.mutateAsync({
  prescriptionId: string,
  prescriptionItemId: string,
  patientId: string,
  daysAhead?: number
});
```

---

## UI Components

### MedicationScheduleWidget

**Props:**
```typescript
{
  patientId?: string          // If set, show only for this patient
  showCompact?: boolean       // If true, show summary only
}
```

**Features:**
- Overdue section (red) with count badge
- Due Soon section (yellow)
- Each dose shows:
  - Medication name + dosage
  - Scheduled time with countdown
  - Dropdown menu (Record / Skip)
- Toast notifications for success/errors

### MedicationAuditTrail

**Props:**
```typescript
{
  patientId?: string          // Filter by patient
  showCompact?: boolean       // Show recent administrations only
}
```

**Features:**
- 5 stat cards (Total, Administered, Skipped, Refused, Delayed)
- Search bar (medication name, notes)
- Status filter dropdown
- Date range selector (7/30/90 days, all time)
- Sortable table with nurse, time, dosage, route, notes

---

## Error Handling

### Common Errors

**"Scheduled dose not found"**
- Cause: Dose ID doesn't exist or was deleted
- Solution: Refresh page, try again

**"Failed to record administration"**
- Cause: Database RLS policy or network issue
- Solution: Check user role, verify internet, retry

**"User not authenticated"**
- Cause: Session expired
- Solution: Re-login

### Logging

All mutations include detailed console logging:
```
[useRecordMedicationAdministration] Recording dose: {...}
[useRecordMedicationAdministration] Success: {...}
[useRecordMedicationAdministration] Failed: {...error message...}
```

---

## Future Enhancements

### Phase 2 (Not Yet Implemented)
- [ ] Push notifications for overdue medications
- [ ] Pharmacy verification workflow (2-nurse check)
- [ ] Medication interaction warnings
- [ ] Patient allergy alerts at administration time
- [ ] Automatic refill requests
- [ ] Medication effectiveness tracking

### Phase 3
- [ ] Integration with electronic signals (smartwatch alerts)
- [ ] Voice confirmation of administration
- [ ] Real-time inventory tracking
- [ ] Automated incident reporting (missed doses)

---

## Migration Instructions

### 1. Apply Database Migration

Run in Supabase SQL Editor:

```sql
-- Execute the full migration file:
-- supabase/migrations/20260214_medication_scheduling_audit.sql
```

### 2. Deploy Components

Components are already in:
- `src/components/dashboard/MedicationScheduleWidget.tsx`
- `src/components/dashboard/MedicationAuditTrail.tsx`
- `src/hooks/useMedicationScheduling.ts`
- Integrated into `src/pages/NursingDashboard.tsx`

### 3. Test Workflow

1. Create a prescription
2. Mark as "dispensed"
3. Observe scheduled_doses auto-generate
4. Go to nursing dashboard
5. See medications due in MedicationScheduleWidget
6. Record administration
7. Verify in MedicationAuditTrail

---

## Performance Considerations

- **Scheduled Doses:** Generated once per prescription
- **Due Medications Query:** Runs every 2 minutes (lightweight filter)
- **Audit Log:** Uses pagination/infinite scroll for large datasets
- **Indexes:** On patient_id, status, scheduled_time for fast queries

---

## Testing Checklist

- [ ] Prescription creates scheduled doses automatically
- [ ] Due medications display correctly with time
- [ ] Overdue medications show red highlight
- [ ] Recording administration updates display
- [ ] Audit log shows all administrations
- [ ] Filtering works (patient, status, date range)
- [ ] Skip dose records reason correctly
- [ ] Nurses can only see their patients
- [ ] Admins can see all medications
- [ ] Toast notifications appear on success/error
