# Notification System - Quick Start Guide

## TL;DR

The HMIS now has a comprehensive notification system. After any database operation that changes status or creates records, call the appropriate `NotificationService` method to notify relevant staff.

## Most Common Scenarios

### 1. Appointments Created

**Location**: `src/pages/AdminAppointments.tsx` → Create handler  
**Action**: When appointment is successfully created

```typescript
// After creating appointment in DB
await NotificationService.notifyAppointmentScheduled(
  doctorId,
  patientName,
  formattedDate,
  appointmentTime,
  appointmentId
);
```

### 2. Lab Order Completed / Results Ready

**Location**: `src/pages/LaboratoryDashboard.tsx` → Process handler  
**Action**: When lab sample is processed and results are ready

```typescript
// After marking sample as processed
await NotificationService.notifyLabResultsReady(
  doctorId,
  patientName,
  testName,
  labOrderId
);
```

### 3. Lab Results Abnormal

**Location**: `src/pages/LaboratoryDashboard.tsx` → When marking results  
**Action**: When entering abnormal lab values

```typescript
// When abnormal result is detected
await NotificationService.notifyAbnormalResults(
  doctorId,
  patientName,
  testName,
  'Elevated glucose levels',
  labOrderId
);
```

### 4. Prescription Ready for Pickup

**Location**: `src/pages/Pharmacy.tsx` → Prescription processing  
**Action**: When prescription is dispensed and ready

```typescript
// When pharmacy completes prescription
await NotificationService.notifyPrescriptionReady(
  patientId,
  patientName,
  prescriptionId,
  true // isPatient
);
```

### 5. Low Stock Alert

**Location**: `src/pages/Pharmacy.tsx` → Inventory management  
**Action**: During inventory updates

```typescript
// When stock drops below threshold
if (newQuantity < 10) {
  await NotificationService.notifyLowStock(
    pharmacyStaffId,
    medicationName,
    newQuantity
  );
}
```

### 6. Invoice Created

**Location**: `src/pages/Invoices.tsx` → Create handler  
**Action**: After invoice is created

```typescript
// After creating invoice
await NotificationService.notifyInvoiceCreated(
  billingStaffId,
  patientName,
  totalAmount,
  invoiceId
);

// Also notify patient about pending payment
await NotificationService.notifyPaymentPending(
  patientId,
  totalAmount,
  dueDate,
  invoiceId
);
```

### 7. Payment Received

**Location**: `src/pages/Invoices.tsx` → Payment recording  
**Action**: After payment is recorded

```typescript
// After recording payment
await NotificationService.notifyPaymentReceived(
  patientId,
  amountPaid,
  invoiceId
);
```

### 8. Appointment Cancelled

**Location**: `src/pages/AdminAppointments.tsx` → Cancel handler  
**Action**: When appointment status changes to cancelled

```typescript
// After cancelling appointment
await NotificationService.notifyAppointmentCancelled(
  doctorId,
  patientName,
  formattedDate,
  cancellationReason,
  appointmentId
);
```

## Implementation Checklist

### For Each Page, Add Notifications When:

#### AdminAppointments.tsx
- [ ] Appointment created → `notifyAppointmentScheduled`
- [ ] Appointment confirmed → `notifyAppointmentConfirmed`
- [ ] Appointment cancelled → `notifyAppointmentCancelled`
- [ ] Appointment completed → `notifyAppointmentCompleted`
- [ ] Patient marked no-show → `notifyAppointmentNoShow`

#### LaboratoryDashboard.tsx
- [ ] Lab order created → `notifyLabOrderCreated`
- [ ] Lab result ready → `notifyLabResultsReady`
- [ ] Abnormal result detected → `notifyAbnormalResults`
- [ ] Sample rejected → `notifyLabSampleRejected`

#### Pharmacy.tsx
- [ ] Prescription submitted → `notifyPrescriptionSubmitted`
- [ ] Prescription ready → `notifyPrescriptionReady`
- [ ] Prescription dispensed → `notifyPrescriptionDispensed`
- [ ] Low stock detected → `notifyLowStock` / `notifyCriticalStock`

#### Invoices.tsx / Billing.tsx
- [ ] Invoice created → `notifyInvoiceCreated` + `notifyPaymentPending`
- [ ] Payment received → `notifyPaymentReceived`
- [ ] Payment overdue → `notifyPaymentOverdue`

#### DoctorExamination.tsx
- [ ] Examination completed → `notifyExaminationResultReady`

#### NursingDashboard.tsx
- [ ] Patient checks in → `notifyPatientCheckIn`

#### StaffSchedule.tsx
- [ ] Schedule published → `notifySchedulePublished`
- [ ] Schedule changed → `notifyScheduleChanged`

## Code Template

Use this template for each notification integration:

```typescript
// 1. Perform database operation
const { data: result, error } = await supabase
  .from('table_name')
  .update({ status: 'new_status' })
  .eq('id', recordId);

if (error) {
  toast.error('Operation failed');
  return;
}

// 2. Fetch necessary details for notification
const { data: record } = await supabase
  .from('table_name')
  .select('user_id, patient:patients(...), type')
  .eq('id', recordId)
  .single();

// 3. Call appropriate notification method
if (record) {
  await NotificationService.notifyAppropriateMethod(
    record.user_id,
    record.patient.first_name + ' ' + record.patient.last_name,
    // ... other required parameters
    recordId
  );
  
  toast.success('Operation completed and notifications sent');
}

refetch(); // Refresh data
```

## How Users See Notifications

1. **Bell Icon** in top-right of header shows unread count
2. **Click bell** → dropdown shows 5 most recent notifications
3. **Click notification** → marks as read
4. **Color coding** indicates priority:
   - Red = Urgent (abnormal results, critical stock, system alerts)
   - Orange = High (cancellations, overdue payments, rejections)
   - Color-coded by type otherwise
5. **Icons** show notification category (calendar for appointments, flask for labs, etc.)

## Testing Notifications

Add this to any component's useEffect to test:

```typescript
useEffect(() => {
  const testNotifications = async () => {
    // Test appointment notification
    await NotificationService.notifyAppointmentScheduled(
      currentUserId,
      'Test Patient',
      '2026-02-15',
      '10:00 AM',
      'test-id-123'
    );

    // Test abnormal result notification
    await NotificationService.notifyAbnormalResults(
      currentUserId,
      'Test Patient',
      'Blood Test',
      'High glucose levels',
      'lab-test-456'
    );

    console.log('Test notifications sent!');
  };

  testNotifications();
}, []);
```

## Import Statement

Add to every file that needs notifications:

```typescript
import NotificationService from '@/services/notificationService';
```

## No Breaking Changes

- Existing code works as-is
- Notifications are additive (only called after DB operations)
- All notification operations are async but don't block UI
- Errors in notification creation don't affect main operations

## Common Parameters Needed

Gather these before calling notification methods:

```
user_id - The ID of the user to notify (doctor ID, staff ID, etc.)
patientName - Full name from patients table
appointmentDate - ISO date string
appointmentTime - Time string (e.g., "10:00 AM")
recordId - ID of the record being referenced (appointment_id, lab_order_id, etc.)
```

## Where to Get These Parameters

```typescript
// From appointments table
const { doctor_id, patients: { first_name, last_name } } = appointment;

// From lab_orders table
const { doctor_id, patients: {...} } = labOrder;

// From prescriptions table
const { pharmacy_staff_id, patients: {...} } = prescription;

// From invoices table
const { created_by, patient_id } = invoice;
```

## Next Steps

1. Read `NOTIFICATION_SYSTEM_GUIDE.md` for full documentation
2. Follow `NOTIFICATION_INTEGRATION_EXAMPLE.md` for detailed examples
3. Pick one page from checklist above to implement first
4. Test by checking notification dropdown in header
5. Repeat for other pages

## Questions?

Refer to:
- **Architecture**: See `NOTIFICATION_SYSTEM_GUIDE.md` → Architecture section
- **All available methods**: See `src/services/notificationService.ts`
- **Component details**: See `useNotifications.tsx` hook implementation
- **Visual styling**: See `NotificationItem.tsx` for icon/color mapping

---

**Key Point**: Notifications are created immediately after database changes. No need for separate jobs or scheduled tasks (though future enhancements might add appointment reminders as scheduled tasks).
