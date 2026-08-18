// Shared helper for resolving per-project notification recipients from
// public.project_notification_recipients. Import in any edge function with:
//   import { resolveNotificationContacts } from "../_shared/notification-recipients.ts";

export type NotificationChannel =
  | "bid"
  | "po"
  | "schedule"
  | "bid_submitted"
  | "accounting";

export interface NotificationUser {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone_number: string | null;
  company_name: string | null;
}

export interface NotificationContacts {
  primary: NotificationUser | null;
  cc: NotificationUser[];
  ccEmails: string[];
}

/**
 * Resolve the Primary contact and CC list for a given (project, notification channel).
 *
 * - Primary = row where is_primary_<channel> = true.
 * - If no primary set, fall back to the alphabetically-first user with receive_<channel> = true.
 * - If nobody is checked, fall back to the project's Construction Manager (then project owner as a last resort).
 * - CC list = every OTHER user (not the primary) with receive_<channel> = true.
 *
 * The caller must pass a Supabase client with service-role privileges.
 */
export async function resolveNotificationContacts(
  supabase: any,
  projectId: string,
  channel: NotificationChannel,
): Promise<NotificationContacts> {
  const receiveField = `receive_${channel}`;
  const primaryField = `is_primary_${channel}`;

  const { data: rows, error } = await supabase
    .from("project_notification_recipients")
    .select(
      `user_id, ${receiveField}, ${primaryField}`,
    )
    .eq("project_id", projectId);

  if (error) {
    console.error(
      `[notification-recipients] Failed to load recipients for project ${projectId} / ${channel}:`,
      error,
    );
  }

  const receivers: string[] = [];
  let primaryUserId: string | null = null;

  for (const r of rows || []) {
    if ((r as any)[receiveField]) receivers.push(r.user_id as string);
    if ((r as any)[primaryField]) primaryUserId = r.user_id as string;
  }

  // Fetch user details for all involved users (+ owner fallback)
  const userIds = new Set<string>(receivers);
  if (primaryUserId) userIds.add(primaryUserId);

  let users: NotificationUser[] = [];
  if (userIds.size > 0) {
    const { data: userRows } = await supabase
      .from("users")
      .select(
        "id, first_name, last_name, email, phone_number, company_name, access_revoked, pending_removal_at, confirmed",
      )
      .in("id", Array.from(userIds));
    // Never contact or CC a removed / revoked / unconfirmed employee, even if
    // a stale project_notification_recipients row survives.
    users = ((userRows || []) as any[])
      .filter(
        (u) =>
          u.access_revoked !== true &&
          !u.pending_removal_at &&
          u.confirmed !== false,
      )
      .map(({ id, first_name, last_name, email, phone_number, company_name }) => ({
        id,
        first_name,
        last_name,
        email,
        phone_number,
        company_name,
      })) as NotificationUser[];
  }
  const usersById = new Map(users.map((u) => [u.id, u]));


  // Determine primary (fallbacks: first alphabetical checked user, then project owner)
  let primary: NotificationUser | null = primaryUserId
    ? usersById.get(primaryUserId) || null
    : null;

  if (!primary && receivers.length > 0) {
    const sorted = [...receivers]
      .map((id) => usersById.get(id))
      .filter(Boolean) as NotificationUser[];
    sorted.sort((a, b) => {
      const an = `${a.first_name || ""} ${a.last_name || ""}`.trim().toLowerCase();
      const bn = `${b.first_name || ""} ${b.last_name || ""}`.trim().toLowerCase();
      return an.localeCompare(bn);
    });
    primary = sorted[0] || null;
  }

  if (!primary) {
    // Final fallback: project's Construction Manager, then project owner as last resort
    const { data: proj } = await supabase
      .from("projects")
      .select("construction_manager, owner_id")
      .eq("id", projectId)
      .maybeSingle();
    const candidates = [proj?.construction_manager, proj?.owner_id].filter(
      Boolean,
    ) as string[];
    for (const fallbackUserId of candidates) {
      const { data: fallbackRow } = await supabase
        .from("users")
        .select(
          "id, first_name, last_name, email, phone_number, company_name, access_revoked, pending_removal_at",
        )
        .eq("id", fallbackUserId)
        .maybeSingle();
      const fr = fallbackRow as any;
      if (fr && fr.access_revoked !== true && !fr.pending_removal_at) {
        primary = {
          id: fr.id,
          first_name: fr.first_name,
          last_name: fr.last_name,
          email: fr.email,
          phone_number: fr.phone_number,
          company_name: fr.company_name,
        };
        break;
      }
    }

  }

  const cc: NotificationUser[] = receivers
    .filter((id) => id !== (primary?.id ?? null))
    .map((id) => usersById.get(id))
    .filter((u): u is NotificationUser => !!u && !!u.email);

  const ccEmails = cc.map((u) => u.email as string);

  return { primary, cc, ccEmails };
}
