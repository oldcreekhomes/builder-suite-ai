/**
 * Formats a phone number string to xxx-xxx-xxxx format.
 * Strips all non-digit characters, then formats if 10 digits.
 * For 11-digit numbers starting with 1, strips the leading 1 first.
 */
export function formatPhoneNumber(value: string | null | undefined): string {
  if (!value) return "";
  const digits = value.replace(/\D/g, "");
  const normalized = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  if (normalized.length === 10) {
    return `${normalized.slice(0, 3)}-${normalized.slice(3, 6)}-${normalized.slice(6)}`;
  }
  // Return original if not a standard 10-digit US number
  return value;
}

/**
 * Formats phone input as user types, allowing partial entry.
 * Produces xxx-xxx-xxxx progressively.
 */
export function formatPhoneInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}
