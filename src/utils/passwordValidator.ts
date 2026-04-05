/**
 * Password validation utilities for healthcare system
 * Policy: Minimum 8 characters, at least 1 uppercase letter, at least 1 number
 */

export interface PasswordRequirements {
  minLength: boolean;    // At least 8 characters
  hasUppercase: boolean; // At least one uppercase letter
  hasNumber: boolean;    // At least one number
}

export const validatePassword = (password: string): PasswordRequirements => {
  return {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasNumber: /\d/.test(password),
  };
};

export const isPasswordValid = (password: string): boolean => {
  const requirements = validatePassword(password);
  return requirements.minLength && requirements.hasUppercase && requirements.hasNumber;
};

export const getPasswordErrors = (password: string): string[] => {
  const requirements = validatePassword(password);
  const errors: string[] = [];

  if (!requirements.minLength) {
    errors.push('Password must be at least 8 characters long');
  }
  if (!requirements.hasUppercase) {
    errors.push('Password must contain at least one uppercase letter (A-Z)');
  }
  if (!requirements.hasNumber) {
    errors.push('Password must contain at least one number (0-9)');
  }

  return errors;
};
