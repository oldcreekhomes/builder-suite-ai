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

function statusFor(lastAction: string | null, lastSignIn: string | null | undefined) {
  if (!lastSignIn) return { label: "Never logged in", color: "bg-muted text-muted-foreground" };
  const ref = lastAction ? new Date(lastAction).getTime() : new Date(lastSignIn).getTime();
  const days = (Date.now() - ref) / 86400000;
  if (days <= 1) return { label: "Active today", color: "bg-green-500/15 text-green-700 dark:text-green-400" };
  if (days <= 7) return { label: "Idle 7d", color: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400" };
  return { label: "Idle 30d+", color: "bg-red-500/15 text-red-700 dark:text-red-400" };
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
  const { data, isLoading } = useEmployeeActivity(canSee);

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
                  <TableHead className="w-44">Last login</TableHead>
                  <TableHead className="w-44">Last action</TableHead>
                  <TableHead className="w-32">Status</TableHead>
                  <TableHead className="w-24 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((r) => {
                  const s = statusFor(r.last_action, r.last_sign_in_at);
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
                        <TableCell className="text-xs">{fmt(r.last_sign_in_at)}</TableCell>
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
                          <TableCell colSpan={6}>
                            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 py-2 text-xs">
                              {[
                                ["Bills", r.bills_count],
                                ["POs", r.pos_count],
                                ["Bids", r.bids_count],
                                ["JEs", r.jes_count],
                                ["Files", r.files_count],
                                ["Budgets", r.budgets_count],
                                ["Schedule", r.schedule_count],
                              ].map(([label, val]) => (
                                <div key={label as string} className="rounded border p-2">
                                  <div className="text-muted-foreground">{label}</div>
                                  <div className="text-sm font-medium tabular-nums">{val as number}</div>
                                </div>
                              ))}
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
