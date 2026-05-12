import { useState } from "react";
import { useEmployeeActivity, EmployeeActivityRow } from "@/hooks/useEmployeeActivity";
import { useNotificationPreferences } from "@/hooks/useNotificationPreferences";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronDown, ChevronRight, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";

function statusFor(lastAction: string | null) {
  if (!lastAction) return { label: "No activity", color: "bg-muted text-muted-foreground" };
  const refMs = new Date(lastAction).getTime();
  const now = new Date();
  const ref = new Date(refMs);
  const hours = (now.getTime() - refMs) / 3600000;
  const green = "bg-green-500/15 text-green-700 dark:text-green-400";
  const yellow = "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400";
  const red = "bg-red-500/15 text-red-700 dark:text-red-400";

  if (hours <= 1) return { label: "Active now", color: green };

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - 86400000;

  if (refMs >= startOfToday) return { label: "Active today", color: green };
  if (refMs >= startOfYesterday) return { label: "Active yesterday", color: yellow };

  const days = (now.getTime() - refMs) / 86400000;
  if (days <= 7) return { label: "Active this week", color: yellow };
  if (days <= 30) return { label: "Idle 30d", color: red };
  return { label: "Inactive", color: red };
}

function fmt(ts: string | null | undefined) {
  if (!ts) return "—";
  try { return formatDistanceToNow(new Date(ts), { addSuffix: true }); } catch { return "—"; }
}

function initials(r: EmployeeActivityRow) {
  const a = (r.first_name?.[0] || "") + (r.last_name?.[0] || "");
  return a || (r.email?.[0]?.toUpperCase() ?? "?");
}

export function EmployeeActivitySection() {
  const { preferences } = useNotificationPreferences();
  const canSee = !!preferences?.can_access_employees;
  const [expanded, setExpanded] = useState<string | null>(null);
  const { data, isLoading, error } = useEmployeeActivity(canSee);

  if (!canSee) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-4 w-4" />
          Employee Activity
          <span className="text-xs font-normal text-muted-foreground ml-2">
            Last 30 days · only visible to you
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-sm text-muted-foreground py-4">Loading…</div>
        ) : error ? (
          <div className="text-sm text-destructive py-4">
            Unable to load employee activity: {(error as Error)?.message ?? "Unknown error"}
          </div>
        ) : !data || data.length === 0 ? (
          <div className="text-sm text-muted-foreground py-4">No employees found.</div>
        ) : (
          <div className="rounded-md border">
            <Table className="table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead>Employee</TableHead>
                  <TableHead className="w-32">Role</TableHead>
                  <TableHead className="w-44">Last action</TableHead>
                  <TableHead className="w-32">Status</TableHead>
                  <TableHead className="w-24 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((r) => {
                  const s = statusFor(r.last_action);
                  const isOpen = expanded === r.user_id;
                  return (
                    <>
                      <TableRow key={r.user_id} className="h-11">
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => setExpanded(isOpen ? null : r.user_id)}
                          >
                            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </Button>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 min-w-0">
                            <Avatar className="h-7 w-7">
                              <AvatarImage src={r.avatar_url ?? undefined} />
                              <AvatarFallback className="text-xs">{initials(r)}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <div className="text-sm font-medium truncate">
                                {[r.first_name, r.last_name].filter(Boolean).join(" ") || r.email}
                              </div>
                              <div className="text-xs text-muted-foreground truncate">{r.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs capitalize text-muted-foreground">
                          {r.role || "—"}
                        </TableCell>
                        <TableCell className="text-xs">{fmt(r.last_action)}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={s.color}>{s.label}</Badge>
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums">
                          {r.total_actions}
                        </TableCell>
                      </TableRow>
                      {isOpen && (
                        <TableRow key={r.user_id + "-d"}>
                          <TableCell />
                          <TableCell colSpan={5}>
                            <div className="py-2">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="w-32">Domain</TableHead>
                                    <TableHead className="text-right">Last 8 hours</TableHead>
                                    <TableHead className="text-right">Last 24 hours</TableHead>
                                    <TableHead className="text-right">Last week</TableHead>
                                    <TableHead className="text-right">Last month</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {([
                                    ["Bills", r.bills_8h, r.bills_24h, r.bills_7d, r.bills_30d],
                                    ["POs", r.pos_8h, r.pos_24h, r.pos_7d, r.pos_30d],
                                    ["Bids", r.bids_8h, r.bids_24h, r.bids_7d, r.bids_30d],
                                    ["JEs", r.jes_8h, r.jes_24h, r.jes_7d, r.jes_30d],
                                    ["Files", r.files_8h, r.files_24h, r.files_7d, r.files_30d],
                                    ["Budgets", r.budgets_8h, r.budgets_24h, r.budgets_7d, r.budgets_30d],
                                    ["Schedule", r.schedule_8h, r.schedule_24h, r.schedule_7d, r.schedule_30d],
                                    ["Photos", r.photos_8h, r.photos_24h, r.photos_7d, r.photos_30d],
                                    ["Chat", r.chat_8h, r.chat_24h, r.chat_7d, r.chat_30d],
                                  ] as Array<[string, number, number, number, number]>).map(([label, a, b, c, d]) => (
                                    <TableRow key={label} className="h-9">
                                      <TableCell className="font-medium text-xs">{label}</TableCell>
                                      {[a, b, c, d].map((v, i) => (
                                        <TableCell
                                          key={i}
                                          className={`text-right text-xs tabular-nums ${v === 0 ? "text-muted-foreground" : ""}`}
                                        >
                                          {v}
                                        </TableCell>
                                      ))}
                                    </TableRow>
                                  ))}
                                  <TableRow className="h-9 border-t-2">
                                    <TableCell className="font-semibold text-xs">Total</TableCell>
                                    {[r.actions_8h, r.actions_24h, r.actions_7d, r.actions_30d].map((v, i) => (
                                      <TableCell key={i} className="text-right text-xs font-semibold tabular-nums">
                                        {v}
                                      </TableCell>
                                    ))}
                                  </TableRow>
                                </TableBody>
                              </Table>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
