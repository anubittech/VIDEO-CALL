export interface ValidationResult {
  valid: boolean;
  error?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validateRegistrationInput = (data: {
  name?: unknown;
  email?: unknown;
  password?: unknown;
  confirmPassword?: unknown;
}): ValidationResult => {
  const { name, email, password, confirmPassword } = data;

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    return { valid: false, error: 'Full name must be at least 2 characters long.' };
  }

  if (name.trim().length > 80) {
    return { valid: false, error: 'Full name cannot exceed 80 characters.' };
  }

  if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
    return { valid: false, error: 'Please provide a valid email address.' };
  }

  if (!password || typeof password !== 'string' || password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters long.' };
  }

  if (password.length > 128) {
    return { valid: false, error: 'Password cannot exceed 128 characters.' };
  }

  if (confirmPassword !== undefined && password !== confirmPassword) {
    return { valid: false, error: 'Passwords do not match.' };
  }

  return { valid: true };
};

export const validateLoginInput = (data: {
  email?: unknown;
  password?: unknown;
}): ValidationResult => {
  const { email, password } = data;

  if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
    return { valid: false, error: 'Please enter a valid email address.' };
  }

  if (!password || typeof password !== 'string' || password.length === 0) {
    return { valid: false, error: 'Please enter your password.' };
  }

  return { valid: true };
};

