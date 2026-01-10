/**
 * Chilean Peso (CLP) currency formatting utilities
 *
 * CLP uses no decimal places and periods as thousand separators
 * Format: $XX.XXX (e.g., $15.000)
 */

/**
 * Format a number as Chilean Pesos
 * @param amount - Amount in CLP (integer, no decimals)
 * @param options - Formatting options
 * @returns Formatted currency string
 */
export function formatCLP(
  amount: number | string,
  options: {
    includeSymbol?: boolean;
    useNegativeParentheses?: boolean;
  } = {}
): string {
  const { includeSymbol = true, useNegativeParentheses = false } = options;

  // Convert to number and ensure integer
  const numericAmount = Math.round(Number(amount) || 0);
  const isNegative = numericAmount < 0;
  const absoluteAmount = Math.abs(numericAmount);

  // Format with thousand separators (periods for Chile)
  const formatted = absoluteAmount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  // Build final string
  let result = includeSymbol ? `$${formatted}` : formatted;

  if (isNegative) {
    result = useNegativeParentheses ? `(${result})` : `-${result}`;
  }

  return result;
}

/**
 * Parse a CLP formatted string to a number
 * @param value - Formatted currency string
 * @returns Number value or 0 if invalid
 */
export function parseCLP(value: string): number {
  if (!value || typeof value !== 'string') {
    return 0;
  }

  // Remove currency symbol, spaces, and thousand separators
  const cleaned = value
    .replace(/\$/g, '')
    .replace(/\./g, '')
    .replace(/\s/g, '')
    .replace(/,/g, ''); // Also handle comma as decimal (shouldn't be there, but just in case)

  const parsed = parseInt(cleaned, 10);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Format amount for display with optional compact notation
 * @param amount - Amount in CLP
 * @param compact - Use compact notation for large numbers
 * @returns Formatted string
 */
export function formatCLPCompact(amount: number, compact: boolean = true): string {
  if (!compact || Math.abs(amount) < 1000000) {
    return formatCLP(amount);
  }

  const absoluteAmount = Math.abs(amount);
  const isNegative = amount < 0;

  let formatted: string;
  if (absoluteAmount >= 1000000000) {
    // Billions (mil millones)
    formatted = `$${(absoluteAmount / 1000000000).toFixed(1).replace('.', ',')} MM`;
  } else if (absoluteAmount >= 1000000) {
    // Millions
    formatted = `$${(absoluteAmount / 1000000).toFixed(1).replace('.', ',')} M`;
  } else {
    formatted = formatCLP(absoluteAmount);
  }

  return isNegative ? `-${formatted}` : formatted;
}

/**
 * Validate if a string is a valid CLP amount
 * @param value - String to validate
 * @returns true if valid CLP format
 */
export function isValidCLPFormat(value: string): boolean {
  if (!value || typeof value !== 'string') {
    return false;
  }

  // Allow: $XX.XXX, XX.XXX, or just numbers
  const pattern = /^-?\$?\d{1,3}(\.\d{3})*$/;
  return pattern.test(value.trim());
}

/**
 * Format input as user types (for form inputs)
 * @param value - Raw input value
 * @returns Formatted value for display
 */
export function formatCLPInput(value: string): string {
  // Remove everything except digits and minus sign at start
  let cleaned = value.replace(/[^\d-]/g, '');

  // Handle negative sign
  const isNegative = cleaned.startsWith('-');
  cleaned = cleaned.replace(/-/g, '');

  // Remove leading zeros
  cleaned = cleaned.replace(/^0+/, '') || '0';

  // Parse to number
  const amount = parseInt(cleaned, 10) || 0;

  // Format with separators (but no $ symbol for input)
  let formatted = amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  return isNegative ? `-${formatted}` : formatted;
}
