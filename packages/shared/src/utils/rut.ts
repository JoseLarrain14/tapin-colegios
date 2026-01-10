/**
 * Chilean RUT (Rol Unico Tributario) validation utilities
 *
 * RUT format: XX.XXX.XXX-V where V is the verification digit
 * The verification digit can be 0-9 or K
 */

/**
 * Clean RUT string by removing dots, hyphens, and spaces
 */
export function cleanRut(rut: string): string {
  return rut.replace(/[.\-\s]/g, '').toUpperCase();
}

/**
 * Calculate the verification digit for a RUT number
 */
export function calculateVerificationDigit(rutNumber: string | number): string {
  const rut = String(rutNumber);
  let sum = 0;
  let multiplier = 2;

  for (let i = rut.length - 1; i >= 0; i--) {
    sum += parseInt(rut[i], 10) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }

  const remainder = 11 - (sum % 11);

  if (remainder === 11) return '0';
  if (remainder === 10) return 'K';
  return String(remainder);
}

/**
 * Validate a Chilean RUT
 * @param rut - RUT string in any format (with or without dots/hyphen)
 * @returns true if valid, false otherwise
 */
export function validateRut(rut: string): boolean {
  if (!rut || typeof rut !== 'string') {
    return false;
  }

  const cleanedRut = cleanRut(rut);

  // Must be at least 8 characters (7 digits + 1 verification digit)
  if (cleanedRut.length < 8 || cleanedRut.length > 9) {
    return false;
  }

  // Extract number and verification digit
  const rutNumber = cleanedRut.slice(0, -1);
  const providedDigit = cleanedRut.slice(-1);

  // Check if rutNumber is all digits
  if (!/^\d+$/.test(rutNumber)) {
    return false;
  }

  // Check if verification digit is valid (0-9 or K)
  if (!/^[0-9K]$/.test(providedDigit)) {
    return false;
  }

  // Calculate and compare verification digit
  const calculatedDigit = calculateVerificationDigit(rutNumber);
  return providedDigit === calculatedDigit;
}

/**
 * Format a RUT string to standard Chilean format (XX.XXX.XXX-V)
 * @param rut - RUT string in any format
 * @returns Formatted RUT or empty string if invalid
 */
export function formatRut(rut: string): string {
  const cleanedRut = cleanRut(rut);

  if (cleanedRut.length < 2) {
    return cleanedRut;
  }

  const body = cleanedRut.slice(0, -1);
  const verificationDigit = cleanedRut.slice(-1);

  // Add thousand separators (dots)
  const formattedBody = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  return `${formattedBody}-${verificationDigit}`;
}

/**
 * Parse RUT and extract its components
 */
export function parseRut(rut: string): {
  isValid: boolean;
  number: string | null;
  verificationDigit: string | null;
  formatted: string | null;
} {
  const cleanedRut = cleanRut(rut);

  if (!validateRut(rut)) {
    return {
      isValid: false,
      number: null,
      verificationDigit: null,
      formatted: null,
    };
  }

  return {
    isValid: true,
    number: cleanedRut.slice(0, -1),
    verificationDigit: cleanedRut.slice(-1),
    formatted: formatRut(rut),
  };
}

/**
 * Generate a random valid RUT (for testing purposes only)
 */
export function generateRandomRut(): string {
  // Generate a random number between 1000000 and 99999999
  const rutNumber = Math.floor(Math.random() * 98999999) + 1000000;
  const verificationDigit = calculateVerificationDigit(rutNumber);
  return formatRut(`${rutNumber}${verificationDigit}`);
}
