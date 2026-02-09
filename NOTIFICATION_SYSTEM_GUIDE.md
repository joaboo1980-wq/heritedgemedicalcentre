# HMIS Notification System Documentation

## Overview

The Heritage Medical Centre HMIS features a comprehensive, role-based notification system designed to keep all staff members informed of important events and transitions in the system. Notifications are automatically created when specific business events occur and are presented to users in real-time with appropriate priority levels.

## Architecture

### Components

1. **NotificationService** (`src/services/notificationService.ts`)
   - Centralized service for creating all types of notifications
   - Static methods for each notification scenario
   - Handles bulk notifications for multiple users
   - Contains business logic for notification creation

2. **useNotifications Hook** (`src/hooks/useNotifications.tsx`)
   - Manages notification state in frontend
   - Real-time subscriptions via Supabase
   - Mark as read, delete, clear operations
   - Sorts by creation date, limits to 20 recent notifications

3. **NotificationDropdown Component** (`src/components/notifications/NotificationDropdown.tsx`)
   - Header component rendering notification bell icon
   - Shows unread count badge
   - Dropdown menu with scrollable list
   - Actions: mark all read, clear all

4. **NotificationItem Component** (`src/components/notifications/NotificationItem.tsx`)
   - Individual notification display
   - Icon + Color coding by type and priority
   - Mark as read / Delete buttons
   - Time stamp (relative time format)

### Database Table

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal',
  is_read BOOLEAN NOT NULL DEFAULT false,
  reference_id UUID,
  reference_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE
);
```

## Notification Types

### Appointment Notifications
- **appointment_scheduled** - Doctor is notified when new appointment is scheduled
- **appointment_confirmed** - Doctor is notified when receptionist confirms appointment
- **appointment_reminder** - Doctor receives reminder 24 hours before appointment
- **appointment_completed** - Doctor is notified when appointment is marked complete
- **appointment_cancelled** - Relevant staff notified when appointment is cancelled
- **appointment_no_show** - Doctor notified when patient doesn't show up

### Lab Notifications
- **lab_order_created** - Lab technician notified of new lab order
- **lab_results_ready** - Doctor notified when results are available for review
- **lab_results_abnormal** - Doctor urgently notified of abnormal results
- **lab_sample_rejected** - Doctor notified when sample fails validation

### Prescription & Pharmacy Notifications
- **prescription_submitted** - Pharmacy staff notified of new prescription
- **prescription_ready** - Patient/Doctor notified prescription is ready
- **prescription_dispensed** - Doctor notified when prescription is dispensed
- **low_stock_alert** - Pharmacy staff alerted about low medication stock
- **inventory_critical** - Pharmacy manager urgently notified of critical stock

### Billing & Invoice Notifications
- **invoice_created** - Billing staff notified of new invoice
- **invoice_payment_pending** - Patient/Account notified of pending payment
- **invoice_payment_received** - Patient/Account notified payment received
- **invoice_payment_overdue** - Patient/Account alerted when payment overdue

### Medical & Examination Notifications
- **examination_result_ready** - Doctor notified when exam results available
- **medical_record_updated** - Doctor notified when patient record updated
- **patient_check_in** - Nursing staff notified when patient checks in
- **patient_follow_up_needed** - Doctor reminded of needed patient follow-up

### Staff Schedule Notifications
- **staff_schedule_published** - Staff notified when new schedule released
- **staff_schedule_changed** - Staff notified of schedule changes

### System Notifications
- **system_alert** - Critical system alerts for all relevant staff

## Priority Levels

Notifications have 4 priority levels:

- **low** - Informational, non-urgent (e.g., appointment completed)
- **normal** - Standard priority (e.g., new appointment, lab order)
- **high** - Important, requires action (e.g., payment overdue, sample rejected)
- **urgent** - Critical, immediate attention needed (e.g., abnormal results, critical stock)

### Color Coding

- **Urgent**: Red background, red text
- **High**: Orange background, orange text
- **Normal/Low**: Type-based colors:
  - Appointments: Blue
  - Lab: Purple
  - Pharmacy/Prescriptions: Green
  - Billing: Indigo
  - Staff Schedule: Yellow
  - Medical/Exams: Cyan

## Integration Guide

### Using NotificationService in Your Page/Component

#### 1. Appointment Pages

In `AdminAppointments.tsx` or `Appointments.tsx`, when creating/updating appointments:

```typescript
import NotificationService from '@/services/notificationService';

const createAppointmentHandler = async (appointmentData) => {
  // ... create appointment in DB ...
  
  // Notify doctor
  await NotificationService.notifyAppointmentScheduled(
    appointment.doctor_id,
    patientName,
    formatDate(appointmentData.appointment_date),
    appointmentData.appointment_time,
    appointment.id
  );
};

const confirmAppointmentHandler = async (appointmentId, doctorId) => {
  // ... update appointment status ...
  
  await NotificationService.notifyAppointmentConfirmed(
    doctorId,
    patientName,
    formatDate(appointmentDate),
    appointmentId
  );
};

const cancelAppointmentHandler = async (appointmentId, doctorId, reason) => {
  // ... update appointment status ...
  
  await NotificationService.notifyAppointmentCancelled(
    doctorId,
    patientName,
    formatDate(appointmentDate),
    reason,
    appointmentId
  );
};
```

#### 2. Laboratory Pages

In `LaboratoryDashboard.tsx`, when handling lab orders:

```typescript
const markProcessed = async (labOrderId) => {
  // ... update status ...
  
  const { data: order } = await supabase
    .from('lab_orders')
    .select('doctor_id, test_name, patient:patients(...)')
    .eq('id', labOrderId)
    .single();
  
  // Notify doctor that results are ready
  await NotificationService.notifyLabResultsReady(
    order.doctor_id,
    patientName,
    order.test_name,
    labOrderId
  );
};

const rejectSample = async (labOrderId, rejectionReason) => {
  // ... update status to rejected ...
  
  await NotificationService.notifyLabSampleRejected(
    doctorId,
    patientName,
    testName,
    rejectionReason,
    labOrderId
  );
};
```

#### 3. Pharmacy Pages

In `Pharmacy.tsx`, when handling prescriptions:

```typescript
const submitPrescription = async (prescriptionData) => {
  // ... create prescription ...
  
  // Notify pharmacy staff
  const availablePharmacy = getPharmacyStaffId();
  await NotificationService.notifyPrescriptionSubmitted(
    availablePharmacy,
    patientName,
    prescriptionData.medications.length,
    prescription.id
  );
};

const markPrescriptionReady = async (prescriptionId, patientId) => {
  // ... update status ...
  
  // Notify patient via their account contact
  await NotificationService.notifyPrescriptionReady(
    patientId,
    patientName,
    prescriptionId,
    true // isPatient=true
  );
};

const checkLowStock = (medicationId, currentQuantity) => {
  if (currentQuantity < 10) {
    const pharmacyStaffId = getCurrentUserId();
    NotificationService.notifyLowStock(
      pharmacyStaffId,
      medicationName,
      currentQuantity
    );
  }
  
  if (currentQuantity < 3) {
    const managerIds = getPharmacyManagers();
    managerIds.forEach(managerId => {
      NotificationService.notifyCriticalStock(
        managerId,
        medicationName,
        currentQuantity
      );
    });
  }
};
```

#### 4. Billing Pages

In `Invoices.tsx` or `Billing.tsx`:

```typescript
const createInvoice = async (invoiceData) => {
  // ... create invoice ...
  
  // Notify billing staff
  await NotificationService.notifyInvoiceCreated(
    currentBillingStaffId,
    patientName,
    invoiceData.total_amount,
    invoice.id
  );
  
  // Notify patient/account about pending payment
  await NotificationService.notifyPaymentPending(
    patientOrAccountId,
    invoiceData.total_amount,
    formatDate(invoiceData.due_date),
    invoice.id
  );
};

const recordPayment = async (invoiceId, amount) => {
  // ... update invoice status ...
  
  await NotificationService.notifyPaymentReceived(
    patientOrAccountId,
    amount,
    invoiceId
  );
};

const markOverdue = async (invoiceId, patientId, daysOverdue) => {
  // ... update invoice status ...
  
  const { data: invoice } = await getInvoice(invoiceId);
  
  // Send overdue notice
  await NotificationService.notifyPaymentOverdue(
    patientId,
    invoice.total_amount,
    daysOverdue,
    invoiceId
  );
};
```

#### 5. Doctor Examination

In `DoctorExamination.tsx`:

```typescript
const saveExaminationResults = async (examinationData) => {
  // ... save examination ...
  
  // Notify relevant doctors if result is abnormal
  if (examinationData.is_abnormal) {
    const careteamDoctors = await getPatientCareTeam(patientId);
    for (const doctor of careteamDoctors) {
      await NotificationService.notifyExaminationResultReady(
        doctor.id,
        patientName,
        examinationData.exam_type,
        examination.id
      );
    }
  }
};
```

#### 6. Staff Schedule

In `StaffSchedule.tsx`:

```typescript
const publishSchedule = async (scheduleData) => {
  // ... publish schedule ...
  
  // Notify all affected staff
  const affectedStaff = await getScheduleAffectedStaff(scheduleData);
  for (const staff of affectedStaff) {
    await NotificationService.notifySchedulePublished(
      staff.id,
      formatDate(scheduleData.start_date)
    );
  }
};

const updateStaffSchedule = async (staffId, scheduleChanges) => {
  // ... update schedule ...
  
  await NotificationService.notifyScheduleChanged(
    staffId,
    'Schedule adjusted for operational requirements'
  );
};
```

#### 7. Nursing Dashboard

In `NursingDashboard.tsx`:

```typescript
const checkInPatient = async (appointmentId, patientId) => {
  // ... update appointment status ...
  
  const { data: appointment } = await getAppointment(appointmentId);
  
  // Notify nursing staff of check-in
  await NotificationService.notifyPatientCheckIn(
    currentNursingStaffId,
    patientName,
    appointmentId
  );
};
```

## Display & Notification Icons

### Icon Mapping

Each notification type displays with a contextual icon:

- **Appointments**: Calendar, Clock (reminder), CheckCircle (completed), AlertCircle (cancelled/no-show)
- **Lab**: Flask, CheckCircle (ready), AlertTriangle (abnormal), AlertCircle (rejected)
- **Prescriptions**: Pill, CheckCircle (ready), AlertTriangle (critical stock)
- **Billing**: Receipt, AlertTriangle (overdue), CheckCircle (received)
- **Medical**: FileText (records/exams), User (patient-related)
- **Schedule**: Calendar, AlertCircle (changed)
- **Default**: Bell icon

### Priority Visual Hierarchy

1. **Urgent (Red)**: Critical actions requiring immediate attention
   - Abnormal lab results
   - Critical inventory
   - System alerts
   - Overdue payments

2. **High (Orange)**: Important issues requiring action
   - Sample rejection
   - Schedule changes
   - Payment overdue warnings
   - Appointment cancellations

3. **Normal (Type-based colors)**: Standard workflow notifications
   - Appointment creation/confirmation
   - Lab/prescription readiness
   - Regular stock alerts
   - Payment notifications

4. **Low (Type-based colors)**: Confirmational/informational
   - Appointment completed
   - Prescription dispensed
   - Payment received

## Best Practices

### 1. When to Create Notifications

- **Immediately after database update/change**: Create notification right after successful DB operation
- **For critical events**: Always notify before/after critical operations
- **For status changes**: Notify when entity status changes
- **For failures**: Notify relevant staff when operations fail

### 2. Notification Message Guidelines

- **Clear and concise**: Include key information in title/message
- **Action-oriented**: Include what action is needed or what happened
- **Patient names**: Always include patient name for appointment/lab notifications
- **Specific details**: Include test names, amounts, dates as relevant
- **Call to action**: Suggest what the recipient should do

### 3. Notification Recipients

- **Only notify relevant roles**: Don't create noise with unnecessary notifications
- **Doctor appointments**: Only notify assigned doctor
- **Lab results**: Only notify requesting doctor
- **Pharmacy orders**: Only notify pharmacy staff working that shift
- **Billing**: Only notify patients/billing staff relevant to invoice
- **Staff schedule**: Only notify assigned staff member

### 4. Timing & Reminders

- **Immediate notifications**: For critical events (abnormal results, critical stock)
- **Appointment reminders**: 24 hours before appointment (implement scheduled task)
- **Payment reminders**: On due date, then 7/14/30 days overdue
- **Follow-up reminders**: Implement scheduled notifications (via cron/scheduled functions)

### 5. Testing Notifications

```typescript
// Quick test - Add to any page component's useEffect
useEffect(() => {
  NotificationService.notifyAppointmentScheduled(
    userId,
    'Test Patient',
    '2026-02-15',
    '10:00 AM',
    'test-id-123'
  );
}, []);
```

## Future Enhancements

1. **Notification Preferences**: Allow users to opt-in/out of notification types
2. **Email/SMS Integration**: Send critical notifications via email/SMS
3. **In-App Message Center**: Full-page notification history and filtering
4. **Notification Templates**: Customizable templates per organization
5. **Scheduled Notifications**: Appointment reminders, payment reminders via scheduled tasks
6. **Bulk Actions**: Mark multiple notifications as read, archive, etc.
7. **Notification Categories**: Group by type in sidebar/dropdown
8. **Notification Badges**: Show count by type (e.g., "3 Lab", "2 Appts")
9. **Toast Notifications**: Show urgent notifications as system toasts
10. **Notification Analytics**: Track notification open rates, response times

## Troubleshooting

### Notifications Not Appearing

1. Check browser console for errors
2. Verify user_id is correct in database
3. Check Supabase RLS policies allow INSERT/SELECT
4. Verify notification type is valid

### Icons Not Displaying

1. Check NotificationItem component imports
2. Verify notification type matches expected types
3. Check Lucide React icons are installed

### Performance Issues

1. Implement pagination for notification list (currently limited to 20)
2. Archive old notifications after 30 days
3. Optimize real-time subscription filters
4. Consider cleanup cron job for old notifications

## Related Files

- Service: `src/services/notificationService.ts`
- Hook: `src/hooks/useNotifications.tsx`
- Dropdown: `src/components/notifications/NotificationDropdown.tsx`
- Item: `src/components/notifications/NotificationItem.tsx`
- Database: `supabase/migrations/20260123143954_*.sql`
- Header: `src/components/layout/Header.tsx` (uses NotificationDropdown)
