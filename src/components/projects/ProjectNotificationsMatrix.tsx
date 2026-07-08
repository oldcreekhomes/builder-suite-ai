import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyUsers } from "@/hooks/useCompanyUsers";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type ChannelKey = "bid" | "po" | "schedule" | "bid_submitted" | "accounting";

const CHANNELS: { key: ChannelKey; label: string }[] = [
  { key: "bid", label: "Bid" },
  { key: "po", label: "PO" },
  { key: "schedule", label: "Schedule" },
  { key: "bid_submitted", label: "Bid Submitted" },
  { key: "accounting", label: "Accounting Reports" },
];

interface RecipientRow {
  project_id: string;
  user_id: string;
  receive_bid: boolean;
  receive_po: boolean;
  receive_schedule: boolean;
  receive_bid_submitted: boolean;
  receive_accounting: boolean;
  is_primary_bid: boolean;
  is_primary_po: boolean;
  is_primary_schedule: boolean;
  is_primary_bid_submitted: boolean;
  is_primary_accounting: boolean;
}

interface Props {
  projectId: string;
}

export function ProjectNotificationsMatrix({ projectId }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { users, isLoading: usersLoading } = useCompanyUsers();

  const queryKey = ["project-notification-recipients", projectId];

  const { data: rows = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_notification_recipients")
        .select("*")
        .eq("project_id", projectId);
      if (error) throw error;
      return (data || []) as RecipientRow[];
    },
    enabled: !!projectId,
  });

  const rowByUser = useMemo(() => {
    const map = new Map<string, RecipientRow>();
    rows.forEach((r) => map.set(r.user_id, r));
    return map;
  }, [rows]);

  const primaryByChannel = useMemo(() => {
    const map: Partial<Record<ChannelKey, string>> = {};
    for (const r of rows) {
      for (const c of CHANNELS) {
        if ((r as any)[`is_primary_${c.key}`]) map[c.key] = r.user_id;
      }
    }
    return map;
  }, [rows]);

  const upsertMutation = useMutation({
    mutationFn: async (payload: Partial<RecipientRow> & { user_id: string }) => {
      const existing = rowByUser.get(payload.user_id);
      const merged = {
        project_id: projectId,
        user_id: payload.user_id,
        receive_bid: existing?.receive_bid ?? false,
        receive_po: existing?.receive_po ?? false,
        receive_schedule: existing?.receive_schedule ?? false,
        receive_bid_submitted: existing?.receive_bid_submitted ?? false,
        receive_accounting: existing?.receive_accounting ?? false,
        is_primary_bid: existing?.is_primary_bid ?? false,
        is_primary_po: existing?.is_primary_po ?? false,
        is_primary_schedule: existing?.is_primary_schedule ?? false,
        is_primary_bid_submitted: existing?.is_primary_bid_submitted ?? false,
        is_primary_accounting: existing?.is_primary_accounting ?? false,
        ...payload,
      };
      const { error } = await supabase
        .from("project_notification_recipients")
        .upsert(merged, { onConflict: "project_id,user_id" });
      if (error) throw error;
    },
    onError: (err: any) => {
      toast({
        title: "Error saving notification setting",
        description: err?.message || "Please try again.",
        variant: "destructive",
      });
      queryClient.invalidateQueries({ queryKey });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const clearPrimaryMutation = useMutation({
    mutationFn: async ({ channel, exceptUserId }: { channel: ChannelKey; exceptUserId: string }) => {
      const field = `is_primary_${channel}`;
      const { error } = await supabase
        .from("project_notification_recipients")
        .update({ [field]: false })
        .eq("project_id", projectId)
        .neq("user_id", exceptUserId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const handleToggleReceive = (userId: string, channel: ChannelKey, checked: boolean) => {
    const receiveField = `receive_${channel}` as const;
    const primaryField = `is_primary_${channel}` as const;
    const patch: any = { user_id: userId, [receiveField]: checked };
    // If unchecking, also drop primary
    if (!checked) patch[primaryField] = false;
    upsertMutation.mutate(patch);
  };

  const handleTogglePrimary = async (userId: string, channel: ChannelKey) => {
    const row = rowByUser.get(userId);
    const currentPrimaryUserId = primaryByChannel[channel];
    const receiveField = `receive_${channel}` as const;
    const primaryField = `is_primary_${channel}` as const;

    const alreadyPrimary = currentPrimaryUserId === userId;

    if (alreadyPrimary) {
      // Toggle off
      upsertMutation.mutate({ user_id: userId, [primaryField]: false } as any);
      return;
    }

    // Clear existing primary first (to satisfy partial unique index), then set new
    if (currentPrimaryUserId && currentPrimaryUserId !== userId) {
      await clearPrimaryMutation.mutateAsync({ channel, exceptUserId: userId });
    }
    // Ensure receive is true, then set primary
    upsertMutation.mutate({
      user_id: userId,
      [receiveField]: true,
      [primaryField]: true,
    } as any);
  };

  if (isLoading || usersLoading) {
    return <div className="text-sm text-muted-foreground py-4">Loading notification settings…</div>;
  }

  if (users.length === 0) {
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
          mark the primary contact (shown as the sender). Others are CC'd.
        </p>
      </div>

      <div className="border rounded-md overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left font-medium px-3 py-2 sticky left-0 bg-muted/50">User</th>
              {CHANNELS.map((c) => (
                <th key={c.key} className="text-center font-medium px-3 py-2 whitespace-nowrap">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const row = rowByUser.get(u.id);
              const displayName =
                `${u.first_name || ""} ${u.last_name || ""}`.trim() || u.email;
              return (
                <tr key={u.id} className="border-t">
                  <td className="px-3 py-2 sticky left-0 bg-background">
                    <div className="font-medium">{displayName}</div>
                    {u.role && (
                      <div className="text-xs text-muted-foreground capitalize">{u.role}</div>
                    )}
                  </td>
                  {CHANNELS.map((c) => {
                    const isReceiving = !!row?.[`receive_${c.key}` as keyof RecipientRow];
                    const isPrimary = !!row?.[`is_primary_${c.key}` as keyof RecipientRow];
                    return (
                      <td key={c.key} className="px-3 py-2 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Checkbox
                            checked={isReceiving}
                            onCheckedChange={(v) =>
                              handleToggleReceive(u.id, c.key, v === true)
                            }
                          />
                          <button
                            type="button"
                            onClick={() => handleTogglePrimary(u.id, c.key)}
                            className={cn(
                              "transition-colors",
                              isPrimary
                                ? "text-yellow-500 hover:text-yellow-600"
                                : "text-muted-foreground/40 hover:text-muted-foreground"
                            )}
                            title={isPrimary ? "Primary contact (click to remove)" : "Make primary contact"}
                          >
                            <Star
                              className="h-4 w-4"
                              fill={isPrimary ? "currentColor" : "none"}
                            />
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

      <p className="text-xs text-muted-foreground">
        <Star className="inline h-3 w-3 text-yellow-500 fill-current mr-1" />
        Primary contact appears as the sender on outgoing emails. Other checked users are CC'd.
        If no primary is set, the project owner is used.
      </p>
    </div>
  );
}
