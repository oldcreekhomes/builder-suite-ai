import { supabase } from "@/integrations/supabase/client";

/**
 * Resolve the effective tenant owner_id for the current user.
 *
 * - For confirmed company members (employees, accountants, etc. with a home_builder_id),
 *   returns the home builder's owner id.
 * - For owners, returns their own user id.
 * - Returns null if there is no logged-in user.
 *
 * Use this everywhere we previously did:
 *   info?.[0]?.is_employee ? info[0].home_builder_id : user.id
 * That role-specific shortcut breaks for non-"employee" roles and was the root
 * cause of confirmed company members losing access to their builder's cost codes.
 */
export async function getEffectiveOwnerId(): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: info } = await supabase.rpc("get_current_user_home_builder_info");
  const row = info?.[0];

  if (row?.home_builder_id) {
    return row.home_builder_id as string;
  }
  return user.id;
}
