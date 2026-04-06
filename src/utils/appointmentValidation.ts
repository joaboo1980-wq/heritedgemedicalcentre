/**
 * Appointment Validation Utilities
 * Validates appointment scheduling against business rules
 */

import { SupabaseClient } from '@supabase/supabase-js';

interface ValidationResult {
  isValid: boolean;
  error?: string;
}

interface ExistingAppointment {
  id: string;
  doctor_id: string;
  appointment_time: string;
  duration_minutes: number | null;
  status: string;
}

/**
 * Convert time string (HH:mm) to minutes for comparison
 */
function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Check if two time slots overlap
 * @param start1 Start time in minutes (HH:mm format)
 * @param duration1 Duration in minutes
 * @param start2 Start time in minutes (HH:mm format)
 * @param duration2 Duration in minutes
 */
function timesOverlap(
  start1: string,
  duration1: number,
  start2: string,
  duration2: number
): boolean {
  const s1 = timeToMinutes(start1);
  const e1 = s1 + duration1;
  const s2 = timeToMinutes(start2);
  const e2 = s2 + duration2;

  // Times overlap if: NOT (end1 <= start2 OR end2 <= start1)
  return !(e1 <= s2 || e2 <= s1);
}

/**
 * Validate appointment scheduling against existing appointments
 *
 * Rules:
 * 1. No appointments in the past
 * 2. No overlapping appointments for the patient (any doctor)
 * 3. No duplicate appointments with same doctor on same day
 * 4. Only consider active statuses: scheduled, confirmed, waiting, in_progress
 */
export async function validateAppointmentConflicts(
  supabase: SupabaseClient,
  patientId: string,
  doctorId: string,
  appointmentDate: string,
  appointmentTime: string,
  durationMinutes: number
): Promise<ValidationResult> {
  // Rule 1: Check for past date/time
  const appointmentDateTime = new Date(`${appointmentDate}T${appointmentTime}`);
  const now = new Date();

  if (appointmentDateTime < now) {
    return {
      isValid: false,
      error: 'Cannot schedule appointment in the past. Please select a future date and time.',
    };
  }

  // Fetch existing active appointments for this patient on the same date
  // Active statuses: scheduled (not yet happened), confirmed, waiting (checked in), in_progress
  const { data: existingAppointmentsData, error: fetchError } = await supabase
    .from('appointments')
    .select('id, doctor_id, appointment_time, duration_minutes, status')
    .eq('patient_id', patientId)
    .eq('appointment_date', appointmentDate)
    .in('status', ['scheduled', 'confirmed', 'waiting', 'in_progress']);

  if (fetchError) {
    console.error('[Validation] Error fetching existing appointments:', fetchError);
    return {
      isValid: false,
      error: 'Unable to verify appointment availability. Please try again.',
    };
  }

  const existingAppointments: ExistingAppointment[] = existingAppointmentsData || [];

  // Rule 2: Check for overlapping appointments with ANY doctor
  for (const apt of existingAppointments) {
    if (timesOverlap(appointmentTime, durationMinutes, apt.appointment_time, apt.duration_minutes || 30)) {
      return {
        isValid: false,
        error: `Patient is not available at ${appointmentTime}. There is a conflicting appointment at ${apt.appointment_time}. Please choose another time slot.`,
      };
    }
  }

  // Rule 3: Check for duplicate appointment with same doctor on same day
  const sameDoctorAppt = existingAppointments.find(
    (apt) =>
      apt.doctor_id === doctorId &&
      apt.status !== 'cancelled' &&
      apt.status !== 'completed'
  );

  if (sameDoctorAppt) {
    return {
      isValid: false,
      error: `Patient already has an active appointment with this doctor on ${appointmentDate} at ${sameDoctorAppt.appointment_time}. Please schedule with a different doctor or choose another date.`,
    };
  }

  // All validations passed
  return { isValid: true };
}

/**
 * Get available doctors for a patient on a specific date/time (optional enhancement)
 * Returns which doctors have schedule conflicts with this patient
 */
export async function getConflictingDoctors(
  supabase: SupabaseClient,
  patientId: string,
  appointmentDate: string,
  appointmentTime: string,
  durationMinutes: number
): Promise<string[]> {
  const { data: appointmentsData } = await supabase
    .from('appointments')
    .select('doctor_id, appointment_time, duration_minutes')
    .eq('patient_id', patientId)
    .eq('appointment_date', appointmentDate)
    .in('status', ['scheduled', 'confirmed', 'checked-in', 'in_progress']);

  if (!appointmentsData) return [];

  const appointments: ExistingAppointment[] = appointmentsData as ExistingAppointment[];

  return appointments
    .filter((apt) =>
      timesOverlap(appointmentTime, durationMinutes, apt.appointment_time, apt.duration_minutes || 30)
    )
    .map((apt) => apt.doctor_id);
}
