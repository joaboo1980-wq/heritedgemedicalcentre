# Notification System - Implementation Roadmap

## Overview

This document outlines the prioritized implementation plan for adding notifications to each page in the HMIS. Notifications are grouped by impact and can be implemented page-by-page or module-by-module.

## Implementation Phases

### Phase 1: Critical Path (Highest Impact) - Week 1

These pages handle the most important workflows and doctors rely on them first thing.

#### 1.1 AdminAppointments.tsx ⭐ HIGHEST PRIORITY
**Impact**: Doctors depend on appointment notifications  
**Complexity**: Medium  
**Notification Types**: 5
- appointment_scheduled
- appointment_confirmed
- appointment_cancelled
- appointment_completed
- appointment_no_show

**Implementation Steps**:
1. Import NotificationService
2. Wrap create appointment handler
3. Wrap confirm appointment handler
4. Wrap cancel appointment handler
5. Wrap complete appointment handler
6. Test all flows

**Estimated Time**: 1-2 hours

**Checklist**:
- [ ] Import NotificationService
- [ ] Create function wraps successfully
- [ ] Test appointment creation → notification appears
- [ ] Test appointment confirmation → notification updates
- [ ] Test appointment cancellation → doctor notified
- [ ] Test completion flow

---

#### 1.2 LaboratoryDashboard.tsx ⭐ HIGHEST PRIORITY
**Impact**: Lab results are critical for patient care  
**Complexity**: Medium  
**Notification Types**: 4
- lab_order_created
- lab_results_ready
- lab_results_abnormal
- lab_sample_rejected

**Implementation Steps**:
1. Import NotificationService
2. Add notification to order creation
3. Add notification to sample processing
4. Add urgent notification for abnormal results
5. Add notification for sample rejection
6. Test with real lab data

**Estimated Time**: 1-2 hours

**Checklist**:
- [ ] Process button triggers notification
- [ ] Abnormal results trigger urgent notification
- [ ] Reject action triggers doctor notification
- [ ] Test notification priority levels
- [ ] Verify doctor receives urgent alerts

---

#### 1.3 Pharmacy.tsx ⭐ HIGHEST PRIORITY
**Impact**: Pharmacy staff needs to know about prescriptions  
**Complexity**: Medium  
**Notification Types**: 5
- prescription_submitted
- prescription_ready
- prescription_dispensed
- low_stock_alert
- inventory_critical

**Implementation Steps**:
1. Import NotificationService
2. Add to prescription creation notification
3. Add to prescription ready notification
4. Add stock monitoring
5. Test critical stock scenarios

**Estimated Time**: 1-2 hours

**Checklist**:
- [ ] New prescriptions notify pharmacy
- [ ] Pharmacy marks ready → notifications sent
- [ ] Stock > 10 → low stock alert
- [ ] Stock < 3 → critical stock urgent alert
- [ ] Manager receives critical alerts

---

### Phase 2: Financial & Administrative (High Impact) - Week 1-2

These workflows affect billing and organizational operations.

#### 2.1 Invoices.tsx / Billing.tsx ⭐ HIGH PRIORITY
**Impact**: Financial tracking is critical  
**Complexity**: Medium  
**Notification Types**: 4
- invoice_created
- invoice_payment_pending
- invoice_payment_received
- invoice_payment_overdue

**Implementation Steps**:
1. Import NotificationService
2. Add to invoice creation (notify billing staff + patient)
3. Add to payment recording
4. Add scheduled overdue checker (optional for now)
5. Test payment workflows

**Estimated Time**: 1.5-2 hours

**Checklist**:
- [ ] Invoice creation → billing staff + patient notified
- [ ] Payment received → customer confirmation
- [ ] Overdue detection logic (manual for now)
- [ ] Payment pending shows correct priority

---

#### 2.2 StaffSchedule.tsx ⭐ HIGH PRIORITY
**Impact**: Staff depend on schedule notifications  
**Complexity**: Low  
**Notification Types**: 2
- staff_schedule_published
- staff_schedule_changed

**Implementation Steps**:
1. Import NotificationService
2. Add to schedule publish event
3. Add to schedule modification event
4. Test bulk notifications to all staff

**Estimated Time**: 1 hour

**Checklist**:
- [ ] Publishing schedule notifies all affected staff
- [ ] Modifying schedule shows change notification
- [ ] Bulk notification handling works

---

### Phase 3: Clinical Operations (Medium Impact) - Week 2

These workflows support clinical staff in their daily operations.

#### 3.1 DoctorExamination.tsx
**Impact**: Examination results need review  
**Complexity**: Low  
**Notification Types**: 2
- examination_result_ready
- patient_follow_up_needed

**Implementation Steps**:
1. Import NotificationService
2. Add to examination save
3. Add to follow-up marking
4. Test examination workflow

**Estimated Time**: 45 minutes

**Checklist**:
- [ ] Completed exams notify doctor
- [ ] Follow-up marking notifies doctor

---

#### 3.2 NursingDashboard.tsx
**Impact**: Track patient workflow  
**Complexity**: Low  
**Notification Types**: 2
- patient_check_in (new)
- appointment updates (from appointments notifications)

**Implementation Steps**:
1. Import NotificationService
2. Add to check-in action
3. Add to triage actions

**Estimated Time**: 45 minutes

**Checklist**:
- [ ] Patient check-in notifies nursing
- [ ] Triage status updates flow properly

---

### Phase 4: Additional Pages (Lower Impact) - Week 2-3

These pages have lower notification volume but support completeness.

#### 4.1 Laboratory.tsx (Non-Dashboard)
**Complexity**: Low  
**Notification Types**: 1 (lab_order_created)
**Time**: 30 minutes

#### 4.2 DoctorDashboard.tsx
**Complexity**: Low  
**Notification Types**: 2 (prescription_submitted, follow_up_needed)
**Time**: 30 minutes

#### 4.3 Appointments.tsx (Patient/Doctor view)
**Complexity**: Low  
**Notification Types**: Integrated from AdminAppointments
**Time**: 30 minutes

#### 4.4 ReceptionDashboard.tsx
**Complexity**: Low  
**Notification Types**: Uses appointment notifications
**Time**: 30 minutes

---

## Implementation Order (Recommended)

### Sprint 1 (Days 1-2): Critical Workflows

```
Monday:
- [ ] AdminAppointments.tsx (2 hours)
- [ ] LaboratoryDashboard.tsx (2 hours)

Tuesday:
- [ ] Pharmacy.tsx (2 hours)
- [ ] Invoices.tsx / Billing.tsx (2 hours)
```

### Sprint 2 (Days 3-4): Staff Operations

```
Wednesday:
- [ ] StaffSchedule.tsx (1 hour)
- [ ] DoctorExamination.tsx (1 hour)
- [ ] NursingDashboard.tsx (1 hour)
- [ ] Testing & fixing (2 hours)

Thursday:
- [ ] Laboratory.tsx (30 min)
- [ ] DoctorDashboard.tsx (30 min)
- [ ] Appointments.tsx (30 min)
- [ ] Integration testing (2 hours)
```

### Sprint 3 (Days 5+): Polish & Optimization

```
Friday + Next Week:
- [ ] Implement appointment reminders (scheduled task)
- [ ] Implement payment overdue checker (scheduled task)
- [ ] Add notification preferences UI
- [ ] Add email/SMS integration (future)
- [ ] Performance optimization
- [ ] User documentation
```

## Quick Start Implementation Template

For each page, follow this template:

```typescript
// 1. At top of file
import NotificationService from '@/services/notificationService';

// 2. In your mutation/handler
const handleUpdate = async (data) => {
  try {
    // Your DB operation
    const { data: result, error } = await supabase
      .from('table')
      .update(data)
      .eq('id', id);

    if (error) throw error;

    // Fetch full record if needed
    const { data: record } = await supabase
      .from('table')
      .select('user_id, patients(...), status')
      .eq('id', id)
      .single();

    // Call notification service
    if (record) {
      await NotificationService.notifyMethodName(
        record.user_id,
        patientName,
        // ... other params
      );
    }

    toast.success('Done and notification sent');
    refetch();
  } catch (error) {
    console.error('Error:', error);
    toast.error('Failed');
  }
};

// 3. Use in component
<Button onClick={() => handleUpdate(data)}>Save</Button>
```

## Testing Checklist for Each Page

After implementing notifications for a page:

- [ ] Notification appears in dropdown within 2 seconds
- [ ] Correct user receives notification (not everyone)
- [ ] Notification title is clear and actionable
- [ ] Icon matches notification type
- [ ] Priority level is appropriate (color-coded correctly)
- [ ] Mark as read works
- [ ] Delete notification works
- [ ] Notification disappears from list if deleted
- [ ] Multiple notifications stack properly
- [ ] No console errors related to notifications

## Performance Considerations

- Notification creation is async and non-blocking
- Errors in notification creation don't affect main operation
- Real-time updates via Supabase (no polling)
- Notifications limited to 20 recent per user
- Consider archiving old notifications after 30 days (future)

## Success Metrics

Track these metrics to measure implementation success:

1. **Coverage**: X% of critical workflows have notifications
2. **Performance**: Notification appears within 2 seconds
3. **User Adoption**: Y% of users open notifications dropdown
4. **Engagement**: Z% of notifications marked as read
5. **Reduction in Missed Updates**: Fewer "I didn't know about this" incidents

## Deployment Plan

1. **Phase 1 pages** → Test staging → Deploy to production (Week 1)
2. **Phase 2 pages** → Test staging → Deploy to production (Week 1-2)
3. **Phase 3 pages** → Test staging → Deploy to production (Week 2)
4. **Phase 4 pages** → Test staging → Deploy to production (Week 2-3)

For each deployment:
- [ ] Notify all users about new notifications feature
- [ ] Provide training on using notification dropdown
- [ ] Monitor for any issues/complaints
- [ ] Iterate based on feedback

## Future Enhancements (Post-Launch)

1. **Appointment Reminders** - Notify doctor 24 hours before
2. **Payment Reminders** - Notify patient at 7/14/30 days overdue
3. **Email/SMS Integration** - Send critical notifications via email/SMS
4. **Notification Preferences** - Let users choose which notifications to receive
5. **Notification Archive** - Full page for reviewing old notifications
6. **Do Not Disturb** - Quiet hours setting
7. **Notification Categories** - Filter by type (appointments, labs, etc.)
8. **Smart Notifications** - Group related notifications
9. **Notification Analytics** - Track which notifications matter most
10. **Mobile App Notifications** - Push notifications for mobile app

## Questions & Support

For implementation questions, refer to:
- **How-To Guide**: `NOTIFICATION_SYSTEM_GUIDE.md`
- **Code Examples**: `NOTIFICATION_INTEGRATION_EXAMPLE.md`
- **Quick Start**: `NOTIFICATION_QUICK_START.md`
- **Reference Table**: `NOTIFICATION_REFERENCE_TABLE.md`
- **Source Code**: `src/services/notificationService.ts`

---

**Status**: Ready for implementation  
**Last Updated**: February 8, 2026  
**Owner**: Development Team  
**Estimated Total Time**: 15-20 hours (phased over 2 weeks)  
**ROI**: High - Critical for user satisfaction and operational efficiency
