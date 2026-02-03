import { supabase } from "@/integrations/supabase/client";

export interface DuplicateBillInfo {
  billId: string;
  vendorName: string;
  projectName: string;
  billDate: string;
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  existingBill?: DuplicateBillInfo;
}

/**
 * Hook to validate that a reference number (invoice number) is unique across the company.
 * This prevents duplicate invoices from being entered for the same company.
 */
export function useReferenceNumberValidation() {
  /**
   * Check if a reference number already exists for this vendor.
   * @param referenceNumber - The invoice/reference number to check
   * @param vendorId - The vendor ID to check against (per-vendor uniqueness)
   * @param excludeBillId - Optional bill ID to exclude (for editing existing bills)
   * @returns Promise with duplicate check result
   */
  const checkDuplicate = async (
    referenceNumber: string,
    vendorId: string,
    excludeBillId?: string
  ): Promise<DuplicateCheckResult> => {
    // Skip validation for empty/null reference numbers or missing vendorId
    const trimmed = referenceNumber?.trim();
    if (!trimmed || !vendorId) {
      return { isDuplicate: false };
    }

    try {
      // Query for existing bills with this reference number from the same vendor
      let query = supabase
        .from("bills")
        .select(`
          id,
          bill_date,
          reference_number,
          vendor_id,
          project_id,
          status,
          companies!bills_vendor_id_fkey (company_name),
          projects!bills_project_id_fkey (address)
        `)
        .eq("vendor_id", vendorId)
        .neq("status", "void")
        .not("reference_number", "is", null);

      // Exclude the current bill if editing
      if (excludeBillId) {
        query = query.neq("id", excludeBillId);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error checking reference number:", error);
        // On error, allow the operation to proceed (fail open for UX)
        return { isDuplicate: false };
      }

      // Check for case-insensitive match (trimmed)
      const normalizedInput = trimmed.toLowerCase();
      const match = data?.find(
        (bill) =>
          bill.reference_number?.trim().toLowerCase() === normalizedInput
      );

      if (match) {
        // Type assertion for the joined data
        const project = match.projects as { address: string } | null;

        return {
          isDuplicate: true,
          existingBill: {
            billId: match.id,
            vendorName: "this vendor",
            projectName: project?.address || "Unknown Project",
            billDate: match.bill_date,
          },
        };
      }

      return { isDuplicate: false };
    } catch (err) {
      console.error("Unexpected error checking reference number:", err);
      return { isDuplicate: false };
    }
  };

  return { checkDuplicate };
}
