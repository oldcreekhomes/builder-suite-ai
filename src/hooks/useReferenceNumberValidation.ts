import { supabase } from "@/integrations/supabase/client";

export interface DuplicateBillInfo {
  billId?: string;
  vendorName: string;
  projectName: string;
  billDate?: string;
  reason?: "lookup_failed" | "db_constraint" | "duplicate";
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  existingBill?: DuplicateBillInfo;
}

/**
 * Name of the partial unique index that enforces per-vendor reference-number
 * uniqueness at the database level. Migrations must keep this in sync.
 */
export const BILLS_UNIQUE_REFERENCE_INDEX = "bills_unique_vendor_reference";

/**
 * Detects the Postgres unique-violation (23505) for the bill reference-number
 * constraint and returns a user-facing message. Returns null if the error is
 * unrelated.
 */
export function formatDuplicateError(error: any): string | null {
  if (!error) return null;
  const code = error.code || error?.cause?.code;
  const msg =
    (error.message || "") +
    " " +
    (error.details || "") +
    " " +
    (error.hint || "");
  const isUniqueViolation = code === "23505";
  const mentionsIndex =
    msg.includes(BILLS_UNIQUE_REFERENCE_INDEX) ||
    msg.toLowerCase().includes("bills_unique_vendor_reference");
  if (isUniqueViolation && mentionsIndex) {
    return "Duplicate invoice number: a bill with this reference number already exists for this vendor.";
  }
  return null;
}

/**
 * Hook to validate that a reference number (invoice number) is unique
 * per-vendor within the tenant. This is the fast UX path — the database
 * also enforces this via the `bills_unique_vendor_reference` partial unique
 * index, which is the authoritative backstop.
 */
export function useReferenceNumberValidation() {
  /**
   * Check if a reference number already exists for this vendor.
   * Fails CLOSED — on any query error we treat as duplicate so a transient
   * lookup failure can't admit a duplicate bill.
   */
  const checkDuplicate = async (
    referenceNumber: string,
    vendorId: string,
    excludeBillId?: string,
  ): Promise<DuplicateCheckResult> => {
    const trimmed = referenceNumber?.trim();
    if (!trimmed || !vendorId) {
      return { isDuplicate: false };
    }

    try {
      let query = supabase
        .from("bills")
        .select(
          `id, bill_date, reference_number, vendor_id, project_id, status,
           companies!bills_vendor_id_fkey (company_name),
           projects!bills_project_id_fkey (address)`,
        )
        .eq("vendor_id", vendorId)
        .neq("status", "void")
        .not("reference_number", "is", null);

      if (excludeBillId) query = query.neq("id", excludeBillId);

      const { data, error } = await query;

      if (error) {
        console.error("Error checking reference number:", error);
        // FAIL CLOSED — don't let a hiccup admit a duplicate.
        return {
          isDuplicate: true,
          existingBill: {
            vendorName: "this vendor",
            projectName: "unknown",
            reason: "lookup_failed",
          },
        };
      }

      const normalizedInput = trimmed.toLowerCase();
      const match = data?.find(
        (bill) =>
          bill.reference_number?.trim().toLowerCase() === normalizedInput,
      );

      if (match) {
        const project = match.projects as { address: string } | null;
        return {
          isDuplicate: true,
          existingBill: {
            billId: match.id,
            vendorName: "this vendor",
            projectName: project?.address || "Unknown Project",
            billDate: match.bill_date,
            reason: "duplicate",
          },
        };
      }

      return { isDuplicate: false };
    } catch (err) {
      console.error("Unexpected error checking reference number:", err);
      // FAIL CLOSED.
      return {
        isDuplicate: true,
        existingBill: {
          vendorName: "this vendor",
          projectName: "unknown",
          reason: "lookup_failed",
        },
      };
    }
  };

  return { checkDuplicate };
}
