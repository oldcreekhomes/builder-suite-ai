/**
 * Canonical service area definitions and normalization utilities.
 * Single source of truth for all service area values across the app.
 */

export const SERVICE_AREA_OPTIONS = ["Washington, DC", "Outer Banks, NC"] as const;
export type ServiceArea = (typeof SERVICE_AREA_OPTIONS)[number];

const ALIAS_MAP: Record<string, ServiceArea> = {
  "northern virginia": "Washington, DC",
  "northern va": "Washington, DC",
  "nova": "Washington, DC",
};

/** Normalize a single service area string to canonical form, or null if unrecognized. */
export function normalizeServiceArea(area: string): ServiceArea | null {
  const trimmed = area.trim();
  // Check canonical match (case-insensitive)
  const canonical = SERVICE_AREA_OPTIONS.find(
    (opt) => opt.toLowerCase() === trimmed.toLowerCase()
  );
  if (canonical) return canonical;
  // Check aliases
  return ALIAS_MAP[trimmed.toLowerCase()] ?? null;
}

/** Normalize an array of service areas, filtering out unrecognized values and deduplicating. */
export function normalizeServiceAreas(areas: string[] | null | undefined): string[] {
  if (!areas || areas.length === 0) return [];
  const result = new Set<string>();
  for (const area of areas) {
    const normalized = normalizeServiceArea(area);
    if (normalized) result.add(normalized);
  }
  return Array.from(result);
}
