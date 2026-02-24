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
  const canonical = SERVICE_AREA_OPTIONS.find(
    (opt) => opt.toLowerCase() === trimmed.toLowerCase()
  );
  if (canonical) return canonical;
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

const NC_KEYWORDS = [
  "outer banks", "nags head", "kitty hawk", "kill devil hills",
  "duck", "corolla", "manteo", "hatteras", "obx",
];

/** Infer a service area from address fields. Returns canonical value or null. */
export function inferServiceAreaFromAddress(fields: {
  state?: string | null;
  city?: string | null;
  address_line_1?: string | null;
  address?: string | null;
}): ServiceArea | null {
  const combined = [
    fields.state ?? "",
    fields.city ?? "",
    fields.address_line_1 ?? "",
    fields.address ?? "",
  ].join(" ").toLowerCase();

  // Check for NC indicators
  if (
    (fields.state && fields.state.trim().toUpperCase() === "NC") ||
    NC_KEYWORDS.some((kw) => combined.includes(kw))
  ) {
    return "Outer Banks, NC";
  }

  return null;
}

/** Get service areas for a company, with fallback so the result is never empty.
 *  Priority: existing normalized values → inferred from address → default DC. */
export function getCompanyServiceAreasOrDefault(company: {
  service_areas?: string[] | null;
  state?: string | null;
  city?: string | null;
  address_line_1?: string | null;
  address?: string | null;
}): string[] {
  // 1. Try normalizing existing values
  const normalized = normalizeServiceAreas(company.service_areas);
  if (normalized.length > 0) return normalized;

  // 2. Try inferring from address
  const inferred = inferServiceAreaFromAddress(company);
  if (inferred) return [inferred];

  // 3. Hard fallback
  return ["Washington, DC"];
}
