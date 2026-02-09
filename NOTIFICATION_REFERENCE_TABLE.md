# Notification Reference Table

Quick lookup for all notification types, when they're triggered, who receives them, and where to implement.

## Appointment Notifications

| Notification Type | Trigger Event | Location/When | Who Receives | Priority | Service Method |
|---|---|---|---|---|---|
| appointment_scheduled | New appointment created | AdminAppointments.tsx → After insert | Doctor | Normal | `notifyAppointmentScheduled()` |
| appointment_confirmed | Receptionist confirms | AdminAppointments.tsx → Status update | Doctor | Normal | `notifyAppointmentConfirmed()` |
| appointment_reminder | 24 hours before apt | Scheduled task (future) | Doctor | Normal | `notifyAppointmentReminder()` |
| appointment_completed | Appointment marked done | AdminAppointments.tsx → Status complete | Doctor | Low | `notifyAppointmentCompleted()` |
| appointment_cancelled | Apt cancelled | AdminAppointments.tsx → Status cancelled | Doctor | High | `notifyAppointmentCancelled()` |
| appointment_no_show | Patient doesn't show | AdminAppointments.tsx → Mark no-show | Doctor | High | `notifyAppointmentNoShow()` |
| patient_check_in | Patient checks in | NursingDashboard.tsx → Check-in action | Nursing Staff | Normal | `notifyPatientCheckIn()` |

## Laboratory Notifications

| Notification Type | Trigger Event | Location/When | Who Receives | Priority | Service Method |
|---|---|---|---|---|---|
| lab_order_created | New lab order created | Laboratory.tsx / DoctorDashboard.tsx → After insert | Lab Technician | Normal/Urgent* | `notifyLabOrderCreated()` |
| lab_results_ready | Results processed | LaboratoryDashboard.tsx → Mark processed | Doctor | Normal | `notifyLabResultsReady()` |
| lab_results_abnormal | Abnormal values detected | LaboratoryDashboard.tsx → Enter results | Doctor | Urgent | `notifyAbnormalResults()` |
| lab_sample_rejected | Sample fails validation | LaboratoryDashboard.tsx → Reject action | Doctor | High | `notifyLabSampleRejected()` |
| examination_result_ready | Exam results ready | DoctorExamination.tsx → Save results | Doctor | Normal | `notifyExaminationResultReady()` |

*Priority is based on order priority (urgent order = urgent notification)

## Prescription & Pharmacy Notifications

| Notification Type | Trigger Event | Location/When | Who Receives | Priority | Service Method |
|---|---|---|---|---|---|
| prescription_submitted | New prescription created | DoctorDashboard.tsx / Doctor pages → After insert | Pharmacy Staff | Normal | `notifyPrescriptionSubmitted()` |
| prescription_ready | Pharmacy completes filling | Pharmacy.tsx → Mark ready | Patient/Doctor | Normal | `notifyPrescriptionReady()` |
| prescription_dispensed | Prescription handed to patient | Pharmacy.tsx → Mark dispensed | Doctor | Low | `notifyPrescriptionDispensed()` |
| low_stock_alert | Stock drops below 10 units | Pharmacy.tsx → Inventory update | Pharmacy Staff | Normal | `notifyLowStock()` |
| inventory_critical | Stock drops below 3 units | Pharmacy.tsx → Inventory update | Pharmacy Manager | Urgent | `notifyCriticalStock()` |

## Billing & Invoice Notifications

| Notification Type | Trigger Event | Location/When | Who Receives | Priority | Service Method |
|---|---|---|---|---|---|
| invoice_created | New invoice created | Invoices.tsx / Billing.tsx → After insert | Billing Staff | Normal | `notifyInvoiceCreated()` |
| invoice_payment_pending | Invoice created or reminder | Invoices.tsx → After creating invoice | Patient/Account | Normal | `notifyPaymentPending()` |
| invoice_payment_received | Payment recorded | Invoices.tsx → Record payment | Patient/Account | Low | `notifyPaymentReceived()` |
| invoice_payment_overdue | Payment past due date | Invoices.tsx → Scheduled check or manual | Patient/Account | High | `notifyPaymentOverdue()` |

## Staff & Administrative Notifications

| Notification Type | Trigger Event | Location/When | Who Receives | Priority | Service Method |
|---|---|---|---|---|---|
| staff_schedule_published | Schedule released | StaffSchedule.tsx → Publish action | All Assigned Staff | Normal | `notifySchedulePublished()` |
| staff_schedule_changed | Schedule modified | StaffSchedule.tsx → Update action | Affected Staff | High | `notifyScheduleChanged()` |
| medical_record_updated | Patient record changed | Various pages → After update | Doctor | Normal | `notifyMedicalRecordUpdated()` |
| patient_follow_up_needed | Follow-up marked needed | DoctorDashboard.tsx → Action | Doctor | Normal | `notifyPatientFollowUpNeeded()` |
| system_alert | Critical system event | Admin operations | Relevant Staff | High/Urgent | `notifySystemAlert()` |

## Implementation Status Checklist

Track which pages have been updated with notifications:

### Pages Needing Notification Integration

- [ ] **AdminAppointments.tsx** (7 notification types)
  - [ ] Create appointment
  - [ ] Confirm appointment  
  - [ ] Complete appointment
  - [ ] Cancel appointment
  - [ ] Mark no-show

- [ ] **LaboratoryDashboard.tsx** (4 notification types)
  - [ ] Create lab order
  - [ ] Mark results ready
  - [ ] Mark abnormal results
  - [ ] Mark sample rejected

- [ ] **Pharmacy.tsx** (5 notification types)
  - [ ] Submit prescription
  - [ ] Mark ready
  - [ ] Mark dispensed
  - [ ] Stock alerts
  - [ ] Critical stock

- [ ] **Invoices.tsx / Billing.tsx** (4 notification types)
  - [ ] Create invoice
  - [ ] Record payment
  - [ ] Overdue notices
  - [ ] Payment confirmations

- [ ] **DoctorExamination.tsx** (2 notification types)
  - [ ] Save examination results
  - [ ] Mark follow-up needed

- [ ] **NursingDashboard.tsx** (1 notification type)
  - [ ] Patient check-in

- [ ] **StaffSchedule.tsx** (2 notification types)
  - [ ] Publish schedule
  - [ ] Modify schedule

- [ ] **Laboratory.tsx** (1 notification type)
  - [ ] Create lab order

- [ ] **DoctorDashboard.tsx** (2 notification types)
  - [ ] Create prescription
  - [ ] Create follow-up reminder

## Parameter Mapping Guide

### Appointment Notifications

```
source: appointments table (after SELECT with JOIN)
user_id → doctor_id
patientName → patients.first_name + patients.last_name
appointmentDate → appointment_date (format as date)
appointmentTime → appointment_time
appointmentId → id
```

### Lab Notifications

```
source: lab_orders table (with SELECT patient, test info)
user_id → doctor_id (requesting doctor)
patientName → patients.first_name + patients.last_name
testName → lab_tests.test_name
labOrderId → id
priority → order priority (for notifyLabOrderCreated)
```

### Pharmacy Notifications

```
source: prescriptions table
user_id → pharmacy_staff_id (for submitted)
       → patient_id (for ready/dispensed)
patientName → patients.first_name + patients.last_name
medicationCount → count of medication items
prescriptionId → id

source: pharmacy stock
user_id → current_user_id or pharmacy_manager_id
medicationName → name from products table
quantity → current stock count
```

### Invoice Notifications

```
source: invoices table
user_id → created_by (for created)
       → patient_id or account_holder_id (for payment notifications)
patientName → patient from joined table
amount → total_amount
dueDate → due_date
invoiceId → id
daysOverdue → today - due_date
```

## Notification Icons Reference

| Type Pattern | Icon | Color |
|---|---|---|
| appointment_* | Calendar | Blue |
| appointment_reminder | Clock | Blue |
| appointment_cancelled / no_show | AlertCircle | Blue |
| appointment_completed | CheckCircle | Blue |
| lab_* | Flask | Purple |
| lab_results_abnormal | AlertTriangle | Purple |
| lab_results_ready | CheckCircle | Purple |
| prescription_* | Pill | Green |
| prescription_ready | CheckCircle | Green |
| low_stock_* | AlertTriangle | Green |
| invoice_* | Receipt | Indigo |
| invoice_payment_overdue | AlertTriangle | Indigo |
| invoice_payment_received | CheckCircle | Indigo |
| schedule_* | Calendar | Yellow |
| schedule_changed | AlertCircle | Yellow |
| examination_* | FileText | Cyan |
| patient_* | User | Cyan |

## Priority Rules

### Urgent (Red) - Immediate Action Needed
- `lab_results_abnormal` - Doctor must review
- `inventory_critical` - Reorder needed immediately
- `system_alert` - Critical system failures
- Lab orders with `priority='urgent'`

### High (Orange) - Important, Requires Action
- `appointment_cancelled` - Doctor availability changed
- `appointment_no_show` - Patient missed appointment
- `lab_sample_rejected` - New sample needed
- `invoice_payment_overdue` - Payment required
- `staff_schedule_changed` - Staff availability changed

### Normal (Type Color) - Standard Operation
- New appointments, lab orders, prescriptions
- Regular payment/settlement notifications
- Lab results ready (not abnormal)
- Prescription readiness
- Stock alerts (not critical)

### Low (Type Color) - Informational
- `appointment_completed` - Just FYI
- `prescription_dispensed` - Confirmation
- `invoice_payment_received` - Confirmation
- `medical_record_updated` - Information

## Error Handling Pattern

For each notification implementation:

```typescript
try {
  // Database operation
  const { data: result, error: dbError } = await supabase
    .from('table')
    .update(data)
    .eq('id', id);

  if (dbError) throw dbError;

  // Fetch details for notification
  const { data: record, error: fetchError } = await supabase
    .from('table')
    .select('user_id, patients(...), created_at')
    .eq('id', id)
    .single();

  if (fetchError) throw fetchError;

  // Send notification (non-blocking)
  const notifResult = await NotificationService.notifyMethod(
    record.user_id,
    patientName,
    // ... other params
  );

  // Log if notification failed (but don't block main operation)
  if (!notifResult.success) {
    console.warn('[Page] Notification failed:', notifResult.error);
  }

  // Success message
  toast.success('Operation completed');
  refetch();

} catch (error) {
  console.error('[Page] Operation failed:', error);
  toast.error('Operation failed');
}
```

## Real-Time Updates

All notifications created via `NotificationService.createNotification()` will:
1. Be inserted into `public.notifications` table
2. Trigger Supabase real-time event
3. Be received by `useNotifications()` hook subscription
4. Display in UI within 1-2 seconds (real-time)
5. Show system toast based on priority

No polling needed - real-time updates via Supabase channels.

---

**Last Updated**: February 8, 2026  
**Total Notification Types**: 28  
**Fully Integrated**: 0 pages  
**In Progress**: 0 pages  
**To Do**: 9 pages
