import { SupabaseClient } from '@supabase/supabase-js';

export interface ConsultationData {
  patient_id: string;
  chief_complaint?: string;
  assessment_diagnosis?: string;
  triage_temperature?: string | number;
  triage_blood_pressure?: string;
  triage_pulse_rate?: string | number;
  triage_respiratory_rate?: string | number;
  triage_oxygen_saturation?: string | number;
  triage_weight?: string | number;
  triage_height?: string | number;
  history_of_present_illness?: string;
  past_medical_history?: string;
  past_surgical_history?: string;
  medication_list?: string;
  allergies?: string;
  family_history?: string;
  social_history?: string;
  general_appearance?: string;
  heent_examination?: string;
  cardiovascular_examination?: string;
  respiratory_examination?: string;
  abdominal_examination?: string;
  neurological_examination?: string;
  musculoskeletal_examination?: string;
  skin_examination?: string;
  other_systems?: string;
  plan_treatment?: string;
  medications_prescribed?: string;
  follow_up_date?: string;
  referrals?: string;
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

// VITAL SIGNS VALIDATION

/**
 * Validates temperature (Celsius)
 * - Valid range: 35°C to 42°C (covers hypothermia to high fever)
 */
export function validateTemperature(temperature?: string | number): ValidationResult {
  if (!temperature && temperature !== 0) {
    return { isValid: true }; // Optional field
  }

  const temp = typeof temperature === 'string' ? parseFloat(temperature) : temperature;

  if (isNaN(temp)) {
    return { isValid: false, error: 'Temperature must be a valid number' };
  }

  if (temp < 35 || temp > 42) {
    return { isValid: false, error: 'Temperature must be between 35°C and 42°C' };
  }

  return { isValid: true };
}

/**
 * Validates blood pressure format
 * - Format: "XXX/YY" (e.g., "120/80")
 * - Systolic: 60-250 mmHg
 * - Diastolic: 30-150 mmHg
 */
export function validateBloodPressure(bp?: string): ValidationResult {
  if (!bp || !bp.trim()) {
    return { isValid: true }; // Optional field
  }

  const bpPattern = /^(\d{1,3})\/(\d{1,3})$/;
  const match = bp.trim().match(bpPattern);

  if (!match) {
    return { isValid: false, error: 'Blood pressure must be in format: XXX/YY (e.g., 120/80)' };
  }

  const systolic = parseInt(match[1], 10);
  const diastolic = parseInt(match[2], 10);

  // Validate systolic range
  if (systolic < 60 || systolic > 250) {
    return { isValid: false, error: 'Systolic BP must be between 60-250 mmHg' };
  }

  // Validate diastolic range
  if (diastolic < 30 || diastolic > 150) {
    return { isValid: false, error: 'Diastolic BP must be between 30-150 mmHg' };
  }

  // Systolic should be >= diastolic
  if (systolic < diastolic) {
    return { isValid: false, error: 'Systolic BP must be greater than or equal to Diastolic BP' };
  }

  return { isValid: true };
}

/**
 * Validates pulse rate (heart rate)
 * - Valid range: 30-200 bpm
 */
export function validatePulseRate(pulse?: string | number): ValidationResult {
  if (!pulse && pulse !== 0) {
    return { isValid: true }; // Optional field
  }

  const pulseNum = typeof pulse === 'string' ? parseInt(pulse, 10) : pulse;

  if (isNaN(pulseNum)) {
    return { isValid: false, error: 'Pulse rate must be a valid number' };
  }

  if (pulseNum < 30 || pulseNum > 200) {
    return { isValid: false, error: 'Pulse rate must be between 30-200 bpm' };
  }

  return { isValid: true };
}

/**
 * Validates respiratory rate
 * - Valid range: 8-60 breaths per minute
 */
export function validateRespiratoryRate(rr?: string | number): ValidationResult {
  if (!rr && rr !== 0) {
    return { isValid: true }; // Optional field
  }

  const rrNum = typeof rr === 'string' ? parseInt(rr, 10) : rr;

  if (isNaN(rrNum)) {
    return { isValid: false, error: 'Respiratory rate must be a valid number' };
  }

  if (rrNum < 8 || rrNum > 60) {
    return { isValid: false, error: 'Respiratory rate must be between 8-60 breaths/min' };
  }

  return { isValid: true };
}

/**
 * Validates oxygen saturation (SpO2)
 * - Valid range: 70-100%
 */
export function validateOxygenSaturation(o2sat?: string | number): ValidationResult {
  if (!o2sat && o2sat !== 0) {
    return { isValid: true }; // Optional field
  }

  const o2 = typeof o2sat === 'string' ? parseFloat(o2sat) : o2sat;

  if (isNaN(o2)) {
    return { isValid: false, error: 'Oxygen saturation must be a valid number' };
  }

  if (o2 < 70 || o2 > 100) {
    return { isValid: false, error: 'Oxygen saturation must be between 70-100%' };
  }

  return { isValid: true };
}

/**
 * Validates weight (kg)
 * - Valid range: 1-300 kg
 */
export function validateWeight(weight?: string | number): ValidationResult {
  if (!weight && weight !== 0) {
    return { isValid: true }; // Optional field
  }

  const w = typeof weight === 'string' ? parseFloat(weight) : weight;

  if (isNaN(w)) {
    return { isValid: false, error: 'Weight must be a valid number' };
  }

  if (w < 1 || w > 300) {
    return { isValid: false, error: 'Weight must be between 1-300 kg' };
  }

  return { isValid: true };
}

/**
 * Validates height (cm)
 * - Valid range: 50-250 cm
 */
export function validateHeight(height?: string | number): ValidationResult {
  if (!height && height !== 0) {
    return { isValid: true }; // Optional field
  }

  const h = typeof height === 'string' ? parseFloat(height) : height;

  if (isNaN(h)) {
    return { isValid: false, error: 'Height must be a valid number' };
  }

  if (h < 50 || h > 250) {
    return { isValid: false, error: 'Height must be between 50-250 cm' };
  }

  return { isValid: true };
}

// CLINICAL FINDINGS VALIDATION

/**
 * Validates chief complaint
 * - Required field
 * - Any non-empty text
 */
export function validateChiefComplaint(chiefComplaint?: string): ValidationResult {
  if (!chiefComplaint || !chiefComplaint.trim()) {
    return { isValid: false, error: 'Chief complaint is required' };
  }

  return { isValid: true };
}

/**
 * Validates assessment/diagnosis
 * - Required field
 * - Non-empty text
 */
export function validateAssessmentDiagnosis(assessment?: string): ValidationResult {
  if (!assessment || !assessment.trim()) {
    return { isValid: false, error: 'Assessment/Diagnosis is required' };
  }

  return { isValid: true };
}

/**
 * Validates follow-up date if provided
 * - Cannot be before today
 * - Must be within 1 year from today
 */
export function validateFollowUpDate(followUpDate?: string): ValidationResult {
  if (!followUpDate || !followUpDate.trim()) {
    return { isValid: true }; // Optional field
  }

  const fupDate = new Date(followUpDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Check if valid date
  if (isNaN(fupDate.getTime())) {
    return { isValid: false, error: 'Follow-up date must be a valid date' };
  }

  // Check if before today
  if (fupDate < today) {
    return { isValid: false, error: 'Follow-up date cannot be before today' };
  }

  // Check if within 1 year
  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() + 1);

  if (fupDate > maxDate) {
    return { isValid: false, error: 'Follow-up date must be within 1 year from today' };
  }

  return { isValid: true };
}

/**
 * Validates examination system fields
 * - Optional fields, but if provided must be non-empty
 */
export function validateExaminationFields(
  fieldName: string,
  value?: string
): ValidationResult {
  if (!value || !value.trim()) {
    return { isValid: true }; // Optional field
  }

  // Just validate that it has some content
  if (value.trim().length < 2) {
    return { isValid: false, error: `${fieldName} must contain at least 2 characters if provided` };
  }

  return { isValid: true };
}

/**
 * Master validation function for consultation/examination
 * Validates all required and optional fields with appropriate rules
 */
export async function validateConsultation(
  supabase: SupabaseClient,
  data: ConsultationData
): Promise<ValidationResult> {
  console.log('[Consultation Validation] Starting validation...');

  // 1. Validate patient exists
  if (!data.patient_id?.trim()) {
    return { isValid: false, error: 'Patient is required' };
  }

  try {
    const { data: patientExists } = await supabase
      .from('patients')
      .select('id')
      .eq('id', data.patient_id)
      .single();

    if (!patientExists) {
      return { isValid: false, error: 'Selected patient does not exist' };
    }
  } catch (error) {
    console.error('[Consultation Validation] Error checking patient:', error);
    return { isValid: false, error: 'Error validating patient' };
  }

  // 2. Validate chief complaint (required)
  const chiefComplaintValidation = validateChiefComplaint(data.chief_complaint);
  if (!chiefComplaintValidation.isValid) {
    return chiefComplaintValidation;
  }

  // 3. Validate assessment/diagnosis (required)
  const assessmentValidation = validateAssessmentDiagnosis(data.assessment_diagnosis);
  if (!assessmentValidation.isValid) {
    return assessmentValidation;
  }

  // 4. Validate vital signs (optional but formatted)
  const temperatureValidation = validateTemperature(data.triage_temperature);
  if (!temperatureValidation.isValid) {
    return temperatureValidation;
  }

  const bpValidation = validateBloodPressure(data.triage_blood_pressure);
  if (!bpValidation.isValid) {
    return bpValidation;
  }

  const pulseValidation = validatePulseRate(data.triage_pulse_rate);
  if (!pulseValidation.isValid) {
    return pulseValidation;
  }

  const rrValidation = validateRespiratoryRate(data.triage_respiratory_rate);
  if (!rrValidation.isValid) {
    return rrValidation;
  }

  const o2Validation = validateOxygenSaturation(data.triage_oxygen_saturation);
  if (!o2Validation.isValid) {
    return o2Validation;
  }

  const weightValidation = validateWeight(data.triage_weight);
  if (!weightValidation.isValid) {
    return weightValidation;
  }

  const heightValidation = validateHeight(data.triage_height);
  if (!heightValidation.isValid) {
    return heightValidation;
  }

  // 5. Validate follow-up date if provided
  const followUpValidation = validateFollowUpDate(data.follow_up_date);
  if (!followUpValidation.isValid) {
    return followUpValidation;
  }

  // 6. Validate examination fields (optional but minimal quality)
  const examinationFields = [
    { name: 'History of Present Illness', value: data.history_of_present_illness },
    { name: 'General Appearance', value: data.general_appearance },
    { name: 'HEENT Examination', value: data.heent_examination },
    { name: 'Cardiovascular Examination', value: data.cardiovascular_examination },
    { name: 'Respiratory Examination', value: data.respiratory_examination },
    { name: 'Abdominal Examination', value: data.abdominal_examination },
    { name: 'Neurological Examination', value: data.neurological_examination },
    { name: 'Plan/Treatment', value: data.plan_treatment },
  ];

  for (const field of examinationFields) {
    const fieldValidation = validateExaminationFields(field.name, field.value);
    if (!fieldValidation.isValid) {
      return fieldValidation;
    }
  }

  console.log('[Consultation Validation] All validations passed');
  return { isValid: true };
}

/**
 * Quick validation for minimal consultation (just required fields)
 * Useful for quick check-ins or triage consultations
 */
export function validateMinimalConsultation(data: {
  patient_id?: string;
  chief_complaint?: string;
  assessment_diagnosis?: string;
}): ValidationResult {
  if (!data.patient_id?.trim()) {
    return { isValid: false, error: 'Patient is required' };
  }

  const chiefComplaintValidation = validateChiefComplaint(data.chief_complaint);
  if (!chiefComplaintValidation.isValid) {
    return chiefComplaintValidation;
  }

  const assessmentValidation = validateAssessmentDiagnosis(data.assessment_diagnosis);
  if (!assessmentValidation.isValid) {
    return assessmentValidation;
  }

  return { isValid: true };
}
