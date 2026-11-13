import { supabase } from "@/integrations/supabase/client";

/**
 * True when the bank account has active sub-accounts visible to this job
 * (company-wide or tagged to the job). Such a header can't hold money.
 */
export function isParentForProject(
  bankAccountId: string,
  projectId: string | null | undefined,
  children: { parent_id: string | null; project_id: string | null }[],
): boolean {
  return children.some(
    (c) => c.parent_id === bankAccountId && (c.project_id == null || c.project_id === projectId),
  );
}

/** Throws if the bank account is a parent header for this job. */
export async function assertBankNotParent(bankAccountId: string, projectId?: string | null) {
  if (!bankAccountId) return;
  const { data, error } = await supabase
    .from("accounts")
    .select("parent_id, project_id")
    .eq("parent_id", bankAccountId)
    .eq("is_active", true);
  if (error) throw error;
  if (isParentForProject(bankAccountId, projectId, data ?? [])) {
    throw new Error("That bank is a parent account with sub-accounts. Pick a sub-account, like 1015.1.");
  }
}
