/**
 * Sanitize PO sentinel values (__none__, __auto__) to undefined before saving to database.
 */
export function sanitizePoId(value: string | null | undefined): string | null {
  if (!value || value === '__none__' || value === '__auto__') return null;
  return value;
}

/**
 * Derive the bill_lines.po_assignment column from the raw PO selection.
 * - '__none__'  → 'none'  (user explicitly chose "No purchase order")
 * - everything else → null (specific PO picked, or unset)
 */
export function derivePoAssignment(value: string | null | undefined): 'none' | null {
  return value === '__none__' ? 'none' : null;
}

/**
 * Reverse of derivePoAssignment: turn a stored bill_line row back into the UI sentinel
 * the PO dropdown understands.
 * - po_assignment='none' → '__none__' (explicit "No purchase order")
 * - otherwise → the persisted purchase_order_id (or undefined when blank)
 */
export function hydratePoIdForUI(
  purchaseOrderId: string | null | undefined,
  poAssignment: string | null | undefined,
): string | undefined {
  if (poAssignment === 'none') return '__none__';
  return purchaseOrderId || undefined;
}
