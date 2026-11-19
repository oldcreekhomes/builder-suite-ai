/**
 * Single source of truth for which company fields are required.
 *
 * General Payee (engagement_type = "supplier") requires exactly three things:
 * Company name, Company type, and Service area. Everything else (address,
 * phone, website) is optional, because a General Payee can be the IRS, a
 * hardware store, or a utility.
 *
 * Trade Partner keeps the older rule set: it also needs a street address,
 * cost codes and a representative (those last two are validated in the
 * dialogs because they live outside the form).
 */
import { normalizeServiceAreas } from "@/lib/serviceArea";

export type CompanyEngagementType = "trade_partner" | "supplier";

export type CompanyRequirementField =
  | "company_name"
  | "company_type"
  | "service_areas"
  | "address_line_1";

export type CompanyRequirementErrors = Partial<Record<CompanyRequirementField, string>>;

export interface CompanyRequirementInput {
  engagementType: CompanyEngagementType;
  companyName: string | null | undefined;
  companyType: string | null | undefined;
  serviceAreas: string[] | null | undefined;
  addressLine1?: string | null | undefined;
}

/** A service area counts as filled only when it is a recognized area. */
export function hasServiceArea(serviceAreas: string[] | null | undefined): boolean {
  return normalizeServiceAreas(serviceAreas ?? []).length > 0;
}

/** Returns the required-field errors for a company, keyed by field name. */
export function getCompanyRequirementErrors(
  input: CompanyRequirementInput
): CompanyRequirementErrors {
  const errors: CompanyRequirementErrors = {};

  if (!(input.companyName ?? "").trim()) {
    errors.company_name = "Company name is required";
  }

  if (!(input.companyType ?? "").trim()) {
    errors.company_type = "Company type is required";
  }

  if (input.engagementType === "supplier" && !hasServiceArea(input.serviceAreas)) {
    errors.service_areas = "Select at least one service area";
  }

  if (
    input.engagementType === "trade_partner" &&
    !(input.addressLine1 ?? "").trim()
  ) {
    errors.address_line_1 = "Street address is required";
  }

  return errors;
}

/** Human-readable required-field list shown at the top of the dialogs. */
export function getRequiredCompanyFieldLabels(
  engagementType: CompanyEngagementType
): string[] {
  if (engagementType === "supplier") {
    return ["Company name", "Company type", "Service area"];
  }
  return [
    "Company name",
    "Company type",
    "Service area",
    "Street address",
    "Cost codes",
    "Representative",
  ];
}
