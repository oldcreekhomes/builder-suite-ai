import { useMemo } from "react";
import { Star } from "lucide-react";
import { useCompanyUsers } from "@/hooks/useCompanyUsers";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export type ChannelKey = "bid" | "po" | "schedule" | "bid_submitted" | "accounting";

export const NEW_PROJECT_CHANNELS: { key: ChannelKey; label: string }[] = [
  { key: "bid", label: "Bid" },
  { key: "po", label: "PO" },
  { key: "schedule", label: "Schedule" },
  { key: "bid_submitted", label: "Bid Submitted" },
  { key: "accounting", label: "Accounting Reports" },
];

export interface NotificationSelection {
  // userId -> { receive: {channel:boolean}, primary: {channel:boolean} }
  receive: Record<string, Partial<Record<ChannelKey, boolean>>>;
  primary: Record<string, Partial<Record<ChannelKey, boolean>>>;
}

export const emptyNotificationSelection = (): NotificationSelection => ({
  receive: {},
  primary: {},
});

interface Props {
  value: NotificationSelection;
  onChange: (next: NotificationSelection) => void;
  missingChannels?: Set<ChannelKey>;
}

export function NewProjectNotificationsMatrix({ value, onChange, missingChannels }: Props) {
  const { users, isLoading } = useCompanyUsers();

  const sortedUsers = useMemo(
    () =>
      [...users].sort((a, b) => {
        const aKey = (a.first_name || a.email || "").toLowerCase();
        const bKey = (b.first_name || b.email || "").toLowerCase();
        return aKey.localeCompare(bKey);
      }),
    [users]
  );

  const isReceiving = (userId: string, ch: ChannelKey) =>
    !!value.receive[userId]?.[ch];
  const isPrimary = (userId: string, ch: ChannelKey) =>
    !!value.primary[userId]?.[ch];

  const setReceive = (userId: string, ch: ChannelKey, checked: boolean) => {
    const next: NotificationSelection = {
      receive: { ...value.receive, [userId]: { ...value.receive[userId], [ch]: checked } },
      primary: { ...value.primary, [userId]: { ...value.primary[userId] } },
    };
    if (!checked) {
      next.primary[userId] = { ...next.primary[userId], [ch]: false };
    }
    onChange(next);
  };

  const togglePrimary = (userId: string, ch: ChannelKey) => {
    const already = isPrimary(userId, ch);
    const nextReceive = { ...value.receive };
    const nextPrimary = { ...value.primary };
    // Clear primary for this channel across all users
    for (const uid of Object.keys(nextPrimary)) {
      if (nextPrimary[uid]?.[ch]) {
        nextPrimary[uid] = { ...nextPrimary[uid], [ch]: false };
      }
    }
    if (!already) {
      nextPrimary[userId] = { ...nextPrimary[userId], [ch]: true };
      nextReceive[userId] = { ...nextReceive[userId], [ch]: true };
    }
    onChange({ receive: nextReceive, primary: nextPrimary });
  };

  if (isLoading) {
    return <div className="text-sm text-muted-foreground py-4">Loading users…</div>;
  }

  if (sortedUsers.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-4">
        No internal users found. Add employees under Settings → Employees first.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-base font-semibold">Project Notifications</h3>
        <p className="text-xs text-muted-foreground">
          Check the users who should receive each type of notification, then click the star to
          mark the primary contact (shown as the sender on outgoing emails). Other checked users
          are CC'd. A primary contact is required for all 5 notification types.
        </p>
      </div>

      <div className="border rounded-md overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left font-medium px-3 py-2 sticky left-0 bg-muted/50">User</th>
              {NEW_PROJECT_CHANNELS.map((c) => (
                <th
                  key={c.key}
                  className={cn(
                    "font-medium px-3 py-2 whitespace-nowrap",
                    missingChannels?.has(c.key) && "text-red-500"
                  )}
                >
                  <div className="flex justify-center">
                    <span className="inline-flex items-center gap-2">
                      <span>{c.label}</span>
                      <span className="w-4" aria-hidden="true" />
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedUsers.map((u) => {
              const displayName =
                `${u.first_name || ""} ${u.last_name || ""}`.trim() || u.email;
              return (
                <tr key={u.id} className="border-t">
                  <td className="px-3 py-2 sticky left-0 bg-background">
                    <div className="font-medium">{displayName}</div>
                  </td>
                  {NEW_PROJECT_CHANNELS.map((c) => {
                    const receiving = isReceiving(u.id, c.key);
                    const primary = isPrimary(u.id, c.key);
                    return (
                      <td key={c.key} className="px-3 py-2 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Checkbox
                            checked={receiving}
                            onCheckedChange={(v) => setReceive(u.id, c.key, v === true)}
                          />
                          <button
                            type="button"
                            onClick={() => togglePrimary(u.id, c.key)}
                            className={cn(
                              "transition-colors",
                              primary
                                ? "text-yellow-500 hover:text-yellow-600"
                                : "text-muted-foreground/40 hover:text-muted-foreground"
                            )}
                            title={
                              primary
                                ? "Primary contact (click to remove)"
                                : "Make primary contact"
                            }
                          >
                            <Star className="h-4 w-4" fill={primary ? "currentColor" : "none"} />
                          </button>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function getMissingPrimaryChannels(selection: NotificationSelection): Set<ChannelKey> {
  const missing = new Set<ChannelKey>();
  for (const c of NEW_PROJECT_CHANNELS) {
    const anyPrimary = Object.values(selection.primary).some((byCh) => byCh?.[c.key]);
    if (!anyPrimary) missing.add(c.key);
  }
  return missing;
}

export function buildRecipientRows(
  projectId: string,
  selection: NotificationSelection
): Array<Record<string, any>> {
  const userIds = new Set<string>([
    ...Object.keys(selection.receive),
    ...Object.keys(selection.primary),
  ]);
  const rows: Array<Record<string, any>> = [];
  for (const userId of userIds) {
    const row: Record<string, any> = { project_id: projectId, user_id: userId };
    let hasAny = false;
    for (const c of NEW_PROJECT_CHANNELS) {
      const rec = !!selection.receive[userId]?.[c.key];
      const pri = !!selection.primary[userId]?.[c.key];
      row[`receive_${c.key}`] = rec || pri;
      row[`is_primary_${c.key}`] = pri;
      if (rec || pri) hasAny = true;
    }
    if (hasAny) rows.push(row);
  }
  return rows;
}
