import crypto from 'crypto';

const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';

/**
 * Generates a cryptographically random, difficult-to-guess meeting ID
 * formatted as xxxx-xxxx-xxxx (e.g., "k9m4-p7x2-v3n8")
 */
export const generateMeetingId = (): string => {
  const bytes = crypto.randomBytes(12);
  let chars = '';
  for (let i = 0; i < 12; i++) {
    chars += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return `${chars.slice(0, 4)}-${chars.slice(4, 8)}-${chars.slice(8, 12)}`;
};

/**
 * Normalizes a user-supplied meeting code or invitation link into a clean meetingId.
 */
export const normalizeMeetingId = (rawInput: string): string => {
  if (!rawInput || typeof rawInput !== 'string') {
    return '';
  }

  let cleaned = rawInput.trim();

  // If the user pasted a full invitation URL like http://localhost:3000/meeting/abcd-efgh-ijkl
  if (cleaned.includes('/meeting/')) {
    const parts = cleaned.split('/meeting/');
    cleaned = parts[parts.length - 1].split('?')[0].split('#')[0].trim();
  }

  return cleaned.toLowerCase();
};

export const isValidMeetingIdFormat = (meetingId: string): boolean => {
  // Accept standard xxxx-xxxx-xxxx or xxx-xxxx-xxx alphanumeric dash-separated codes (6 to 36 chars)
  return /^[a-z0-9]{3,12}(-[a-z0-9]{3,12}){1,3}$/.test(meetingId);
};

