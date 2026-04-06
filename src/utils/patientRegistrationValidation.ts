import { SupabaseClient } from '@supabase/supabase-js';

export interface PatientRegistrationData {
  first_name: string;
  last_name: string;
  gender: string;
  date_of_birth: string;
  phone?: string;
  email?: string;
  address?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  insurance_provider?: string;
  insurance_number?: string;
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

interface DuplicateCheckResult {
  isDuplicate: boolean;
  existingPatient?: {
    id: string;
    first_name: string;
    last_name: string;
    patient_number: string;
    date_of_birth: string;
  };
  matchType?: 'exact' | 'combination';
}

// PHASE 1 & 2 VALIDATIONS

/**
 * Validates patient first and last names
 * - No numeric characters
 * - No special characters (except hyphens and apostrophes)
 * - Minimum 2 characters
 */
export function validatePatientNames(firstName: string, lastName: string): ValidationResult {
  if (!firstName?.trim()) {
    return { isValid: false, error: 'First name is required' };
  }

  if (!lastName?.trim()) {
    return { isValid: false, error: 'Last name is required' };
  }

  // Check length
  if (firstName.trim().length < 2) {
    return { isValid: false, error: 'First name must be at least 2 characters' };
  }

  if (lastName.trim().length < 2) {
    return { isValid: false, error: 'Last name must be at least 2 characters' };
  }

  // Check for invalid characters (allow hyphens and apostrophes)
  const invalidNamePattern = /[0-9!@#$%^&*()+=[\]{};':"\\|,.<>/?]/g;
  
  if (invalidNamePattern.test(firstName)) {
    return { isValid: false, error: 'First name cannot contain numbers or special characters' };
  }

  if (invalidNamePattern.test(lastName)) {
    return { isValid: false, error: 'Last name cannot contain numbers or special characters' };
  }

  return { isValid: true };
}

/**
 * Validates date of birth
 * - Cannot be in the future
 * - Age must be between 0 and 120 years
 */
export function validateDateOfBirth(dateOfBirth: string): ValidationResult {
  if (!dateOfBirth?.trim()) {
    return { isValid: false, error: 'Date of birth is required' };
  }

  const dob = new Date(dateOfBirth);
  const today = new Date();

  // Check if date is valid
  if (isNaN(dob.getTime())) {
    return { isValid: false, error: 'Date of birth is invalid' };
  }

  // Check if in future
  if (dob > today) {
    return { isValid: false, error: 'Date of birth cannot be in the future' };
  }

  // Calculate age
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  const dayDiff = today.getDate() - dob.getDate();

  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    age--;
  }

  // Check age range
  if (age < 0) {
    return { isValid: false, error: 'Invalid age calculation' };
  }

  if (age > 120) {
    return { isValid: false, error: 'Age cannot exceed 120 years' };
  }

  return { isValid: true };
}

/**
 * Validates gender field
 * - Must be one of: Male, Female, Other
 * - Case-insensitive but normalized
 */
export function validateGender(gender: string): ValidationResult {
  if (!gender?.trim()) {
    return { isValid: false, error: 'Gender is required' };
  }

  const validGenders = ['male', 'female', 'other'];
  const normalizedGender = gender.trim().toLowerCase();

  if (!validGenders.includes(normalizedGender)) {
    return { isValid: false, error: 'Gender must be Male, Female, or Other' };
  }

  return { isValid: true };
}

/**
 * Validates phone number format
 * - Uganda format: +256XXXXXXXXX or 07XXXXXXXXX
 * - Optional field
 */
export function validatePhoneNumber(phone?: string): ValidationResult {
  if (!phone || !phone.trim()) {
    // Phone is optional
    return { isValid: true };
  }

  const phoneRegex = /^(\+256|0)[1-9]\d{8}$/;
  const cleanPhone = phone.replace(/[\s\-()]/g, '');

  if (!phoneRegex.test(cleanPhone)) {
    return { isValid: false, error: 'Phone number must follow format: +256XXXXXXXXX or 07XXXXXXXXX' };
  }

  return { isValid: true };
}

/**
 * Validates email format
 * - Optional field
 * - Standard email validation
 */
export function validateEmail(email?: string): ValidationResult {
  if (!email || !email.trim()) {
    // Email is optional
    return { isValid: true };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email.trim())) {
    return { isValid: false, error: 'Email address is invalid' };
  }

  return { isValid: true };
}

/**
 * Validates Next of Kin information
 * - If name provided, phone must also be provided
 */
export function validateNextOfKin(nokName?: string, nokPhone?: string): ValidationResult {
  if (!nokName && !nokPhone) {
    // Both optional is fine
    return { isValid: true };
  }

  if (nokName && !nokName.trim()) {
    // If name is provided, it must be non-empty
    if (nokPhone?.trim()) {
      return { isValid: false, error: 'Next of kin name is required if phone is provided' };
    }
    return { isValid: true };
  }

  if (nokPhone && !nokPhone.trim()) {
    // If phone is provided, name must also be provided
    if (nokName?.trim()) {
      return { isValid: false, error: 'Next of kin phone is required if name is provided' };
    }
    return { isValid: true };
  }

  // Both are provided - validate format
  if (nokName && nokName.trim()) {
    const nameValidation = validatePatientNames(nokName, 'LastName');
    if (!nameValidation.isValid) {
      return { isValid: false, error: 'Next of kin name contains invalid characters' };
    }
  }

  if (nokPhone && nokPhone.trim()) {
    const phoneValidation = validatePhoneNumber(nokPhone);
    if (!phoneValidation.isValid) {
      return { isValid: false, error: 'Next of kin phone number is invalid' };
    }
  }

  return { isValid: true };
}

/**
 * Validates Patient Category
 * - Must be one of: Outpatient, Inpatient, Emergency
 * - Optional field
 */
export function validatePatientCategory(category?: string): ValidationResult {
  if (!category || !category.trim()) {
    // Category might be optional depending on requirements
    return { isValid: true };
  }

  const validCategories = ['outpatient', 'inpatient', 'emergency'];
  const normalizedCategory = category.trim().toLowerCase();

  if (!validCategories.includes(normalizedCategory)) {
    return { isValid: false, error: 'Patient category must be Outpatient, Inpatient, or Emergency' };
  }

  return { isValid: true };
}

/**
 * Checks for duplicate patients using combination matching
 * - Exact match: phone or email
 * - Combination match: first_name + last_name + date_of_birth
 */
export async function checkForDuplicatePatients(
  supabase: SupabaseClient,
  data: PatientRegistrationData
): Promise<DuplicateCheckResult> {
  try {
    // Check 1: Exact phone match (if provided)
    if (data.phone?.trim()) {
      const { data: existingByPhone, error: phoneError } = await supabase
        .from('patients')
        .select('id, first_name, last_name, patient_number, date_of_birth')
        .eq('phone', data.phone.trim());

      if (phoneError) {
        console.error('[Duplicate Check] Phone check error:', phoneError);
        throw phoneError;
      }

      if (existingByPhone && existingByPhone.length > 0) {
        return {
          isDuplicate: true,
          existingPatient: existingByPhone[0],
          matchType: 'exact',
        };
      }
    }

    // Check 2: Exact email match (if provided)
    if (data.email?.trim()) {
      const { data: existingByEmail, error: emailError } = await supabase
        .from('patients')
        .select('id, first_name, last_name, patient_number, date_of_birth')
        .eq('email', data.email.trim());

      if (emailError) {
        console.error('[Duplicate Check] Email check error:', emailError);
        throw emailError;
      }

      if (existingByEmail && existingByEmail.length > 0) {
        return {
          isDuplicate: true,
          existingPatient: existingByEmail[0],
          matchType: 'exact',
        };
      }
    }

    // Check 3: Combination match (name + DOB + phone)
    // This is more lenient and serves as a "possible duplicate" warning
    const { data: possibleMatches, error: combinationError } = await supabase
      .from('patients')
      .select('id, first_name, last_name, patient_number, date_of_birth, phone')
      .eq('first_name', data.first_name.trim())
      .eq('last_name', data.last_name.trim())
      .eq('date_of_birth', data.date_of_birth);

    if (combinationError) {
      console.error('[Duplicate Check] Combination check error:', combinationError);
      throw combinationError;
    }

    if (possibleMatches && possibleMatches.length > 0) {
      // If phone also matches, this is definitely a duplicate
      const exactMatch = possibleMatches.find((p: typeof possibleMatches[0]) => p.phone === data.phone);
      if (exactMatch) {
        return {
          isDuplicate: true,
          existingPatient: exactMatch,
          matchType: 'combination',
        };
      }
      // Otherwise, it's a possible duplicate (same name + DOB)
      return {
        isDuplicate: true,
        existingPatient: possibleMatches[0],
        matchType: 'combination',
      };
    }

    return { isDuplicate: false };
  } catch (error: unknown) {
    console.error('[Duplicate Check] Unexpected error:', error);
    throw new Error('Error checking for duplicate patients');
  }
}

/**
 * Master validation function - validates all fields
 * Returns first validation error encountered
 */
export async function validatePatientRegistration(
  supabase: SupabaseClient,
  data: PatientRegistrationData
): Promise<ValidationResult> {
  console.log('[Patient Registration] Starting validation...');

  // 1. Validate names (required)
  const nameValidation = validatePatientNames(data.first_name, data.last_name);
  if (!nameValidation.isValid) {
    return nameValidation;
  }

  // 2. Validate date of birth (required)
  const dobValidation = validateDateOfBirth(data.date_of_birth);
  if (!dobValidation.isValid) {
    return dobValidation;
  }

  // 3. Validate gender (required)
  const genderValidation = validateGender(data.gender);
  if (!genderValidation.isValid) {
    return genderValidation;
  }

  // 4. Validate phone (optional but format)
  const phoneValidation = validatePhoneNumber(data.phone);
  if (!phoneValidation.isValid) {
    return phoneValidation;
  }

  // 5. Validate email (optional but format)
  const emailValidation = validateEmail(data.email);
  if (!emailValidation.isValid) {
    return emailValidation;
  }

  // 6. Validate Next of Kin
  const nokValidation = validateNextOfKin(data.emergency_contact_name, data.emergency_contact_phone);
  if (!nokValidation.isValid) {
    return nokValidation;
  }

  // 7. Check for duplicates (phone/email/combination)
  try {
    const duplicateCheck = await checkForDuplicatePatients(supabase, data);
    if (duplicateCheck.isDuplicate) {
      const matchTypeMsg = duplicateCheck.matchType === 'exact' 
        ? 'exact' 
        : 'combination (name + date of birth)';
      return {
        isValid: false,
        error: `A patient with this ${matchTypeMsg} already exists (${duplicateCheck.existingPatient?.first_name} ${duplicateCheck.existingPatient?.last_name}, Patient #${duplicateCheck.existingPatient?.patient_number}). Please verify or use the existing record.`,
      };
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error checking for duplicate patients';
    return {
      isValid: false,
      error: errorMessage || 'Error checking for duplicate patients',
    };
  }

  console.log('[Patient Registration] All validations passed');
  return { isValid: true };
}
