/**
 * INTEGRATION EXAMPLE - Notification Service in AdminAppointments
 * 
 * This file demonstrates how to integrate NotificationService into the AdminAppointments page.
 * Copy these patterns to other pages for consistent notification handling.
 * 
 * NOTE: This is a reference guide. Actual implementation should be integrated into:
 * src/pages/AdminAppointments.tsx
 */

// ============= STEP 1: Import NotificationService =============
import NotificationService from '@/services/notificationService';

// ============= STEP 2: Create Appointments with Notifications =============

/**
 * When creating a new appointment, immediately notify the assigned doctor
 */
const createAppointmentWithNotification = async (appointmentData: any) => {
  try {
    // 1. Create the appointment in database
    const { data: appointment, error } = await supabase
      .from('appointments')
      .insert([appointmentData])
      .select()
      .single();

    if (error || !appointment) {
      toast.error('Failed to create appointment');
      return;
    }

    // 2. Fetch full details needed for notification (patient name, appointment details)
    const { data: appointmentDetails } = await supabase
      .from('appointments')
      .select(`
        id,
        doctor_id,
        patients (first_name, last_name),
        appointment_date,
        appointment_time
      `)
      .eq('id', appointment.id)
      .single();

    // 3. Notify the assigned doctor
    if (appointmentDetails) {
      const patientName = `${appointmentDetails.patients.first_name} ${appointmentDetails.patients.last_name}`;
      const formattedDate = new Date(appointmentDetails.appointment_date).toLocaleDateString();
      
      await NotificationService.notifyAppointmentScheduled(
        appointmentDetails.doctor_id,
        patientName,
        formattedDate,
        appointmentDetails.appointment_time,
        appointmentDetails.id
      );

      toast.success('Appointment created and doctor notified');
    }

    refetch(); // Refresh appointment list
  } catch (error) {
    console.error('[AdminAppointments] Error creating appointment:', error);
    toast.error('Error creating appointment');
  }
};

// ============= STEP 3: Confirm Appointments with Notifications =============

/**
 * When receptionist confirms an appointment, notify the doctor
 */
const confirmAppointmentWithNotification = async (appointmentId: string) => {
  try {
    // 1. Update appointment status to confirmed
    const { error } = await supabase
      .from('appointments')
      .update({ status: 'confirmed', updated_at: new Date().toISOString() })
      .eq('id', appointmentId);

    if (error) {
      toast.error('Failed to confirm appointment');
      return;
    }

    // 2. Fetch appointment details for notification
    const { data: appointment } = await supabase
      .from('appointments')
      .select(`
        id,
        doctor_id,
        patients (first_name, last_name),
        appointment_date
      `)
      .eq('id', appointmentId)
      .single();

    // 3. Notify the doctor
    if (appointment) {
      const patientName = `${appointment.patients.first_name} ${appointment.patients.last_name}`;
      const formattedDate = new Date(appointment.appointment_date).toLocaleDateString();

      await NotificationService.notifyAppointmentConfirmed(
        appointment.doctor_id,
        patientName,
        formattedDate,
        appointmentId
      );

      toast.success('Appointment confirmed and doctor notified');
    }

    refetch();
  } catch (error) {
    console.error('[AdminAppointments] Error confirming appointment:', error);
    toast.error('Error confirming appointment');
  }
};

// ============= STEP 4: Cancel Appointments with Notifications =============

/**
 * When appointment is cancelled, notify the doctor with cancellation reason
 */
const cancelAppointmentWithNotification = async (appointmentId: string, cancellationReason: string) => {
  try {
    // 1. Update appointment status to cancelled
    const { error } = await supabase
      .from('appointments')
      .update({
        status: 'cancelled',
        notes: `Cancelled: ${cancellationReason}`,
        updated_at: new Date().toISOString(),
      })
      .eq('id', appointmentId);

    if (error) {
      toast.error('Failed to cancel appointment');
      return;
    }

    // 2. Fetch appointment details
    const { data: appointment } = await supabase
      .from('appointments')
      .select(`
        id,
        doctor_id,
        patients (first_name, last_name),
        appointment_date
      `)
      .eq('id', appointmentId)
      .single();

    // 3. Notify the doctor about cancellation
    if (appointment) {
      const patientName = `${appointment.patients.first_name} ${appointment.patients.last_name}`;
      const formattedDate = new Date(appointment.appointment_date).toLocaleDateString();

      await NotificationService.notifyAppointmentCancelled(
        appointment.doctor_id,
        patientName,
        formattedDate,
        cancellationReason,
        appointmentId
      );

      toast.success('Appointment cancelled and doctor notified');
    }

    refetch();
  } catch (error) {
    console.error('[AdminAppointments] Error cancelling appointment:', error);
    toast.error('Error cancelling appointment');
  }
};

// ============= STEP 5: Mark Appointment as No-Show =============

/**
 * When patient no-shows, notify the doctor
 */
const markAppointmentNoShowWithNotification = async (appointmentId: string) => {
  try {
    // 1. Update status to no_show
    const { error } = await supabase
      .from('appointments')
      .update({
        status: 'no_show',
        updated_at: new Date().toISOString(),
      })
      .eq('id', appointmentId);

    if (error) {
      toast.error('Failed to mark no-show');
      return;
    }

    // 2. Fetch appointment details
    const { data: appointment } = await supabase
      .from('appointments')
      .select(`
        id,
        doctor_id,
        patients (first_name, last_name)
      `)
      .eq('id', appointmentId)
      .single();

    // 3. Notify doctor of no-show
    if (appointment) {
      const patientName = `${appointment.patients.first_name} ${appointment.patients.last_name}`;

      await NotificationService.notifyAppointmentNoShow(
        appointment.doctor_id,
        patientName,
        appointmentId
      );

      toast.success('Marked as no-show and doctor notified');
    }

    refetch();
  } catch (error) {
    console.error('[AdminAppointments] Error marking no-show:', error);
    toast.error('Error marking appointment');
  }
};

// ============= STEP 6: Complete Appointment =============

/**
 * When appointment is completed, notify the doctor for record-keeping
 */
const completeAppointmentWithNotification = async (appointmentId: string) => {
  try {
    // 1. Update status to completed
    const { error } = await supabase
      .from('appointments')
      .update({
        status: 'completed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', appointmentId);

    if (error) {
      toast.error('Failed to complete appointment');
      return;
    }

    // 2. Fetch appointment details
    const { data: appointment } = await supabase
      .from('appointments')
      .select(`
        id,
        doctor_id,
        patients (first_name, last_name)
      `)
      .eq('id', appointmentId)
      .single();

    // 3. Notify doctor
    if (appointment) {
      const patientName = `${appointment.patients.first_name} ${appointment.patients.last_name}`;

      await NotificationService.notifyAppointmentCompleted(
        appointment.doctor_id,
        patientName,
        appointmentId
      );

      toast.success('Appointment completed and doctor notified');
    }

    refetch();
  } catch (error) {
    console.error('[AdminAppointments] Error completing appointment:', error);
    toast.error('Error completing appointment');
  }
};

// ============= INTEGRATION POINTS IN COMPONENT =============

/**
 * Use these handlers in your component's action buttons:
 * 
 * Example table action buttons:
 * 
 * <Button onClick={() => createAppointmentWithNotification(formData)}>
 *   Create Appointment
 * </Button>
 * 
 * <Button onClick={() => confirmAppointmentWithNotification(appointmentId)}>
 *   Confirm
 * </Button>
 * 
 * <Button onClick={() => cancelAppointmentWithNotification(appointmentId, reason)}>
 *   Cancel
 * </Button>
 * 
 * <Button onClick={() => markAppointmentNoShowWithNotification(appointmentId)}>
 *   Mark No-Show
 * </Button>
 * 
 * <Button onClick={() => completeAppointmentWithNotification(appointmentId)}>
 *   Complete
 * </Button>
 */

// ============= ALTERNATIVE: Async Wrapper Utility =============

/**
 * Optional: Create a reusable wrapper function for appointment operations
 * This centralizes all appointment-related notifications
 */
const appointmentOperations = {
  create: (data: any) => createAppointmentWithNotification(data),
  confirm: (id: string) => confirmAppointmentWithNotification(id),
  cancel: (id: string, reason: string) => cancelAppointmentWithNotification(id, reason),
  markNoShow: (id: string) => markAppointmentNoShowWithNotification(id),
  complete: (id: string) => completeAppointmentWithNotification(id),
};

// Usage:
// await appointmentOperations.confirm(appointmentId);
// await appointmentOperations.cancel(appointmentId, 'Patient requested');

export default appointmentOperations;
