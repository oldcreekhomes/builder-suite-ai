/**
 * Sanitize PO sentinel values (__none__, __auto__) to undefined before saving to database.
 */
export function sanitizePoId(value: string | null | undefined): string | null {
  if (!value || value === '__none__' || value === '__auto__') return null;
  return value;
}
