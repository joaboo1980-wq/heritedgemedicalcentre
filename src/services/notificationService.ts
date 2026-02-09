/**
 * Notification Service
 * 
 * This service handles all notification creation logic for the HMIS.
 * Notifications are automatically created when specific events occur (appointments, lab results, etc.)
 * Different roles receive different notifications based on their responsibilities.
 */

import { supabase } from '@/integrations/supabase/client';

export type NotificationType = 
  | 'appointment_scheduled' 
  | 'appointment_confirmed' 
  | 'appointment_reminder'
  | 'appointment_completed' 
  | 'appointment_cancelled'
  | 'appointment_no_show'
  | 'lab_order_created'
  | 'lab_results_ready' 
  | 'lab_results_abnormal'
  | 'lab_sample_rejected'
  | 'prescription_submitted'
  | 'prescription_ready'
  | 'prescription_dispensed'
  | 'low_stock_alert'
  | 'inventory_critical'
  | 'invoice_created'
  | 'invoice_payment_pending'
  | 'invoice_payment_received'
  | 'invoice_payment_overdue'
  | 'staff_schedule_published'
  | 'staff_schedule_changed'
  | 'medical_record_updated'
  | 'examination_result_ready'
  | 'patient_check_in'
  | 'patient_follow_up_needed'
  | 'system_alert';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface NotificationPayload {
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  priority: NotificationPriority;
  reference_id?: string;
  reference_type?: string;
}

class NotificationService {
  /**
   * Create a notification for a specific user
   */
  static async createNotification(payload: NotificationPayload): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert([
          {
            user_id: payload.user_id,
            title: payload.title,
            message: payload.message,
            type: payload.type,
            priority: payload.priority,
            reference_id: payload.reference_id || null,
            reference_type: payload.reference_type || null,
            is_read: false,
            created_at: new Date().toISOString(),
          },
        ])
        .select('id')
        .single();

      if (error) {
        console.error('[NotificationService] Error creating notification:', error);
        return { success: false, error: error.message };
      }

      console.log('[NotificationService] Notification created successfully:', data.id);
      return { success: true, id: data.id };
    } catch (err) {
      console.error('[NotificationService] Exception creating notification:', err);
      return { success: false, error: String(err) };
    }
  }

  /**
   * Create notifications for multiple users
   */
  static async createBulkNotifications(
    payloads: NotificationPayload[]
  ): Promise<{ success: boolean; count: number; error?: string }> {
    try {
      const { error } = await supabase
        .from('notifications')
        .insert(
          payloads.map(p => ({
            user_id: p.user_id,
            title: p.title,
            message: p.message,
            type: p.type,
            priority: p.priority,
            reference_id: p.reference_id || null,
            reference_type: p.reference_type || null,
            is_read: false,
            created_at: new Date().toISOString(),
          }))
        );

      if (error) {
        console.error('[NotificationService] Error creating bulk notifications:', error);
        return { success: false, count: 0, error: error.message };
      }

      console.log('[NotificationService] Bulk notifications created successfully:', payloads.length);
      return { success: true, count: payloads.length };
    } catch (err) {
      console.error('[NotificationService] Exception creating bulk notifications:', err);
      return { success: false, count: 0, error: String(err) };
    }
  }

  // ============= APPOINTMENT NOTIFICATIONS =============

  /**
   * Notify doctor when appointment is scheduled
   */
  static async notifyAppointmentScheduled(
    doctorId: string,
    patientName: string,
    appointmentDate: string,
    appointmentTime: string,
    appointmentId: string
  ) {
    return this.createNotification({
      user_id: doctorId,
      title: 'New Appointment Scheduled',
      message: `Appointment with ${patientName} on ${appointmentDate} at ${appointmentTime}`,
      type: 'appointment_scheduled',
      priority: 'normal',
      reference_id: appointmentId,
      reference_type: 'appointment',
    });
  }

  /**
   * Notify doctor when appointment is confirmed by receptionist
   */
  static async notifyAppointmentConfirmed(
    doctorId: string,
    patientName: string,
    appointmentDate: string,
    appointmentId: string
  ) {
    return this.createNotification({
      user_id: doctorId,
      title: 'Appointment Confirmed',
      message: `Your appointment with ${patientName} on ${appointmentDate} has been confirmed.`,
      type: 'appointment_confirmed',
      priority: 'normal',
      reference_id: appointmentId,
      reference_type: 'appointment',
    });
  }

  /**
   * Appointment reminder for doctor (24 hours before)
   */
  static async notifyAppointmentReminder(
    doctorId: string,
    patientName: string,
    appointmentDate: string,
    appointmentTime: string,
    appointmentId: string
  ) {
    return this.createNotification({
      user_id: doctorId,
      title: 'Appointment Reminder',
      message: `Reminder: You have an appointment with ${patientName} tomorrow at ${appointmentTime}`,
      type: 'appointment_reminder',
      priority: 'normal',
      reference_id: appointmentId,
      reference_type: 'appointment',
    });
  }

  /**
   * Notify doctor when appointment is completed
   */
  static async notifyAppointmentCompleted(
    doctorId: string,
    patientName: string,
    appointmentId: string
  ) {
    return this.createNotification({
      user_id: doctorId,
      title: 'Appointment Completed',
      message: `Appointment with ${patientName} has been marked as completed.`,
      type: 'appointment_completed',
      priority: 'low',
      reference_id: appointmentId,
      reference_type: 'appointment',
    });
  }

  /**
   * Notify relevant staff when appointment is cancelled
   */
  static async notifyAppointmentCancelled(
    doctorId: string,
    patientName: string,
    appointmentDate: string,
    reason: string,
    appointmentId: string
  ) {
    return this.createNotification({
      user_id: doctorId,
      title: 'Appointment Cancelled',
      message: `Appointment with ${patientName} on ${appointmentDate} has been cancelled. Reason: ${reason}`,
      type: 'appointment_cancelled',
      priority: 'high',
      reference_id: appointmentId,
      reference_type: 'appointment',
    });
  }

  /**
   * Notify relevant staff when patient no-shows
   */
  static async notifyAppointmentNoShow(doctorId: string, patientName: string, appointmentId: string) {
    return this.createNotification({
      user_id: doctorId,
      title: 'Patient No-Show',
      message: `Patient ${patientName} did not show up for their appointment.`,
      type: 'appointment_no_show',
      priority: 'high',
      reference_id: appointmentId,
      reference_type: 'appointment',
    });
  }

  // ============= LAB NOTIFICATIONS =============

  /**
   * Notify lab technician when lab order is created
   */
  static async notifyLabOrderCreated(
    labStaffId: string,
    patientName: string,
    testName: string,
    priority: 'low' | 'normal' | 'high' | 'urgent',
    labOrderId: string
  ) {
    return this.createNotification({
      user_id: labStaffId,
      title: `New Lab Order: ${testName}`,
      message: `Lab order for patient ${patientName} - ${testName}. Priority: ${priority}`,
      type: 'lab_order_created',
      priority: priority === 'urgent' ? 'urgent' : priority === 'high' ? 'high' : 'normal',
      reference_id: labOrderId,
      reference_type: 'lab_order',
    });
  }

  /**
   * Notify doctor when lab results are ready
   */
  static async notifyLabResultsReady(
    doctorId: string,
    patientName: string,
    testName: string,
    labOrderId: string
  ) {
    return this.createNotification({
      user_id: doctorId,
      title: 'Lab Results Ready',
      message: `Lab results for ${patientName} - ${testName} are ready for review.`,
      type: 'lab_results_ready',
      priority: 'normal',
      reference_id: labOrderId,
      reference_type: 'lab_order',
    });
  }

  /**
   * Notify doctor when abnormal results are detected
   */
  static async notifyAbnormalResults(
    doctorId: string,
    patientName: string,
    testName: string,
    abnormalality: string,
    labOrderId: string
  ) {
    return this.createNotification({
      user_id: doctorId,
      title: `⚠️ Abnormal Lab Results`,
      message: `Abnormal results detected for ${patientName} - ${testName}: ${abnormalality}. Immediate review recommended.`,
      type: 'lab_results_abnormal',
      priority: 'urgent',
      reference_id: labOrderId,
      reference_type: 'lab_order',
    });
  }

  /**
   * Notify doctor when lab sample is rejected
   */
  static async notifyLabSampleRejected(
    doctorId: string,
    patientName: string,
    testName: string,
    rejectionReason: string,
    labOrderId: string
  ) {
    return this.createNotification({
      user_id: doctorId,
      title: 'Lab Sample Rejected',
      message: `Sample for ${patientName} - ${testName} was rejected. Reason: ${rejectionReason}. New sample required.`,
      type: 'lab_sample_rejected',
      priority: 'high',
      reference_id: labOrderId,
      reference_type: 'lab_order',
    });
  }

  // ============= PRESCRIPTION & PHARMACY NOTIFICATIONS =============

  /**
   * Notify pharmacy when prescription is submitted
   */
  static async notifyPrescriptionSubmitted(
    pharmacyStaffId: string,
    patientName: string,
    medicationCount: number,
    prescriptionId: string
  ) {
    return this.createNotification({
      user_id: pharmacyStaffId,
      title: 'New Prescription Submitted',
      message: `Prescription for ${patientName} with ${medicationCount} medication(s) needs dispensing.`,
      type: 'prescription_submitted',
      priority: 'normal',
      reference_id: prescriptionId,
      reference_type: 'prescription',
    });
  }

  /**
   * Notify patient/doctor when prescription is ready
   */
  static async notifyPrescriptionReady(
    userId: string,
    patientName: string,
    prescriptionId: string,
    isPatient: boolean = false
  ) {
    const messagePrefix = isPatient ? `Your prescription for ${patientName}` : `Prescription for ${patientName}`;
    return this.createNotification({
      user_id: userId,
      title: 'Prescription Ready for Pickup',
      message: `${messagePrefix} is ready for pickup at the pharmacy.`,
      type: 'prescription_ready',
      priority: 'normal',
      reference_id: prescriptionId,
      reference_type: 'prescription',
    });
  }

  /**
   * Notify doctor when prescription is dispensed
   */
  static async notifyPrescriptionDispensed(
    doctorId: string,
    patientName: string,
    prescriptionId: string
  ) {
    return this.createNotification({
      user_id: doctorId,
      title: 'Prescription Dispensed',
      message: `Prescription for ${patientName} has been dispensed.`,
      type: 'prescription_dispensed',
      priority: 'low',
      reference_id: prescriptionId,
      reference_type: 'prescription',
    });
  }

  /**
   * Notify pharmacy staff about low stock
   */
  static async notifyLowStock(pharmacyStaffId: string, medicationName: string, quantity: number) {
    return this.createNotification({
      user_id: pharmacyStaffId,
      title: 'Low Stock Alert',
      message: `${medicationName} stock is running low. Current quantity: ${quantity} units.`,
      type: 'low_stock_alert',
      priority: 'normal',
    });
  }

  /**
   * Notify pharmacy manager about critical stock levels
   */
  static async notifyCriticalStock(pharmacyManagerId: string, medicationName: string, quantity: number) {
    return this.createNotification({
      user_id: pharmacyManagerId,
      title: '🚨 Critical Stock Level',
      message: `URGENT: ${medicationName} at critical level. Current quantity: ${quantity} units. Immediate reorder required.`,
      type: 'inventory_critical',
      priority: 'urgent',
    });
  }

  // ============= BILLING & INVOICE NOTIFICATIONS =============

  /**
   * Notify billing staff when invoice is created
   */
  static async notifyInvoiceCreated(
    billingStaffId: string,
    patientName: string,
    amount: number,
    invoiceId: string
  ) {
    return this.createNotification({
      user_id: billingStaffId,
      title: 'New Invoice Created',
      message: `Invoice for ${patientName} - Amount: PKR ${amount.toFixed(2)} created and ready for processing.`,
      type: 'invoice_created',
      priority: 'normal',
      reference_id: invoiceId,
      reference_type: 'invoice',
    });
  }

  /**
   * Notify patient/responsible person when payment is pending
   */
  static async notifyPaymentPending(
    userId: string,
    amount: number,
    dueDate: string,
    invoiceId: string
  ) {
    return this.createNotification({
      user_id: userId,
      title: 'Payment Due',
      message: `You have a pending payment of PKR ${amount.toFixed(2)}. Due date: ${dueDate}`,
      type: 'invoice_payment_pending',
      priority: 'normal',
      reference_id: invoiceId,
      reference_type: 'invoice',
    });
  }

  /**
   * Notify patient when payment is received
   */
  static async notifyPaymentReceived(userId: string, amount: number, invoiceId: string) {
    return this.createNotification({
      user_id: userId,
      title: 'Payment Received',
      message: `We have received your payment of PKR ${amount.toFixed(2)}. Thank you!`,
      type: 'invoice_payment_received',
      priority: 'low',
      reference_id: invoiceId,
      reference_type: 'invoice',
    });
  }

  /**
   * Notify patient when payment is overdue
   */
  static async notifyPaymentOverdue(
    userId: string,
    amount: number,
    daysOverdue: number,
    invoiceId: string
  ) {
    return this.createNotification({
      user_id: userId,
      title: '⚠️ Payment Overdue',
      message: `Your payment of PKR ${amount.toFixed(2)} is now ${daysOverdue} days overdue. Please arrange payment immediately.`,
      type: 'invoice_payment_overdue',
      priority: 'high',
      reference_id: invoiceId,
      reference_type: 'invoice',
    });
  }

  // ============= MEDICAL EXAMINATION NOTIFICATIONS =============

  /**
   * Notify doctor when examination result is ready
   */
  static async notifyExaminationResultReady(
    doctorId: string,
    patientName: string,
    examinationType: string,
    examinationId: string
  ) {
    return this.createNotification({
      user_id: doctorId,
      title: 'Examination Result Ready',
      message: `${examinationType} examination result for ${patientName} is ready for review.`,
      type: 'examination_result_ready',
      priority: 'normal',
      reference_id: examinationId,
      reference_type: 'examination',
    });
  }

  /**
   * Notify nursing staff when patient checks in
   */
  static async notifyPatientCheckIn(nursingStaffId: string, patientName: string, appointmentId: string) {
    return this.createNotification({
      user_id: nursingStaffId,
      title: 'Patient Check-In',
      message: `${patientName} has checked in for their appointment.`,
      type: 'patient_check_in',
      priority: 'normal',
      reference_id: appointmentId,
      reference_type: 'appointment',
    });
  }

  // ============= STAFF SCHEDULE NOTIFICATIONS =============

  /**
   * Notify staff when schedule is published
   */
  static async notifySchedulePublished(staffId: string, scheduleStartDate: string) {
    return this.createNotification({
      user_id: staffId,
      title: 'New Schedule Published',
      message: `Your work schedule for ${scheduleStartDate} has been published. Please review.`,
      type: 'staff_schedule_published',
      priority: 'normal',
    });
  }

  /**
   * Notify staff when their schedule is changed
   */
  static async notifyScheduleChanged(staffId: string, changeReason: string) {
    return this.createNotification({
      user_id: staffId,
      title: 'Schedule Changed',
      message: `Your work schedule has been changed. Reason: ${changeReason}. Please check your updated schedule.`,
      type: 'staff_schedule_changed',
      priority: 'high',
    });
  }

  // ============= PATIENT FOLLOW-UP NOTIFICATIONS =============

  /**
   * Notify doctor about patient needing follow-up
   */
  static async notifyPatientFollowUpNeeded(
    doctorId: string,
    patientName: string,
    followUpReason: string,
    appointmentId?: string
  ) {
    return this.createNotification({
      user_id: doctorId,
      title: 'Patient Follow-Up Needed',
      message: `Patient ${patientName} needs follow-up. Reason: ${followUpReason}`,
      type: 'patient_follow_up_needed',
      priority: 'normal',
      reference_id: appointmentId,
      reference_type: 'appointment',
    });
  }

  /**
   * Notify doctor when medical record is updated
   */
  static async notifyMedicalRecordUpdated(doctorId: string, patientName: string, updateType: string) {
    return this.createNotification({
      user_id: doctorId,
      title: 'Medical Record Updated',
      message: `Medical record for ${patientName} has been updated. Update: ${updateType}`,
      type: 'medical_record_updated',
      priority: 'normal',
    });
  }

  // ============= SYSTEM NOTIFICATIONS =============

  /**
   * Send system-wide alerts
   */
  static async notifySystemAlert(userId: string, alertTitle: string, alertMessage: string) {
    return this.createNotification({
      user_id: userId,
      title: `[System] ${alertTitle}`,
      message: alertMessage,
      type: 'system_alert',
      priority: 'high',
    });
  }
}

export default NotificationService;
