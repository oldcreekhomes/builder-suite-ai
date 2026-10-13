import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Wallet, RefreshCw, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useProjects } from "@/hooks/useProjects";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { cashPositionTotals, scopeCashPositionRows, type CashPositionScope } from "@/lib/cashPositionScope";

type Row = {
  project_id: string;
  address: string;
  account_id: string | null;
  account_code: string | null;
  account_name: string | null;
  bank_balance: number;
  approved_due: number;
};

type LiveConn = {
  id: string;
  project_id: string;
  account_id: string;
  current_balance: number | null;
  last_synced_at: string | null;
  last_error: string | null;
  institution_name: string | null;
  account_mask: string | null;
};

const DAY_OPTIONS = [10, 15, 20];
const r2 = (v: number) => Math.round(v * 100) / 100;

function formatCurrency(value: number) {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const STREET_SUFFIX =
  /^(.*?\b(?:street|st|avenue|ave|road|rd|drive|dr|lane|ln|way|court|ct|boulevard|blvd|place|pl|terrace|ter|circle|cir|parkway|pkwy|highway|hwy)\.?(?:\s+(?:n|s|e|w|ne|nw|se|sw)\b\.?)?)(?:\s+.*)?$/i;

// Street only — drop city/state/zip even when there is no comma before the city.
function shortAddress(a: string) {
  const first = (a || "").split(",")[0].trim();
  const m = first.match(STREET_SUFFIX);
  return m ? m[1] : first;
}

function getManagerInitials(manager?: { first_name: string; last_name: string } | null) {
  if (!manager) return null;

  const firstInitial = manager.first_name.trim().charAt(0);
  const lastInitial = manager.last_name.trim().charAt(0);
  return `${firstInitial}${lastInitial}`.toUpperCase() || null;
}

/**
 * Cash Position — one row per active job:
 * Job | Bank account + job balance | Approved bills due in N days | Balance − bills
 */
export function CashPositionCard({ scope = "company" }: { scope?: CashPositionScope }) {
  const { user } = useAuth();
  const managerView = scope === "accounting-manager";
  const [days, setDays] = useState<number>(10);
  const [searchQuery, setSearchQuery] = useState("");
  const { data: projects = [], isLoading: projectsLoading } = useProjects();

  const query = useQuery({
    queryKey: ["project-cash-position", user?.id, scope, days],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("get_project_cash_position", {
        p_days: days,
      });
      if (error) throw error;
      return ((data as any[]) || []).map((r) => ({
        project_id: r.project_id,
        address: r.address,
        account_id: r.account_id,
        account_code: r.account_code,
        account_name: r.account_name,
        bank_balance: Number(r.bank_balance) || 0,
        approved_due: Number(r.approved_due) || 0,
      })) as Row[];
    },
    staleTime: 60_000,
    enabled: !!user?.id,
  });

  const connQuery = useQuery({
    queryKey: ["bank-connections", user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("bank_connections")
        .select("id, project_id, account_id, current_balance, last_synced_at, last_error, institution_name, account_mask");
      if (error) throw error;
      return (data || []) as LiveConn[];
    },
    staleTime: 60_000,
    enabled: !!user?.id,
  });
  const liveMap = new Map((connQuery.data || []).map((c) => [`${c.project_id}:${c.account_id}`, c]));
  const [syncing, setSyncing] = useState(false);
  const refreshAll = async () => {
    setSyncing(true);
    try {
      if ((connQuery.data || []).length > 0) {
        await supabase.functions.invoke("plaid", { body: { action: "refresh" } });
      }
    } finally {
      await Promise.all([query.refetch(), connQuery.refetch()]);
      setSyncing(false);
    }
  };

  // Live bank balance replaces book balance when a bank is connected; book stays in the tooltip.
  const withLive = (query.data || []).map((r) => {
    const live = liveMap.get(`${r.project_id}:${r.account_id}`);
    return live && live.current_balance != null
      ? { ...r, book_balance: r.bank_balance, bank_balance: Number(live.current_balance), live }
      : { ...r, book_balance: r.bank_balance, live };
  });
  const allRows = scopeCashPositionRows(withLive, projects, scope, user?.id);
  const q = searchQuery.trim().toLowerCase();
  const rows = q
    ? allRows.filter((r) => {
        const project = projects.find((item) => item.id === r.project_id);
        const manager = project?.accounting_manager_user;
        const managerName = manager
          ? `${manager.first_name} ${manager.last_name}`.trim()
          : "";
        return (
          shortAddress(r.address).toLowerCase().includes(q) ||
          (r.account_name || "").toLowerCase().includes(q) ||
          (r.account_code || "").toLowerCase().includes(q) ||
          managerName.toLowerCase().includes(q)
        );
      })
    : allRows;
  const { bank: totBank, due: totDue, net: totNet } = cashPositionTotals(rows);

  const netClass = (n: number) => (n < 0 ? "text-destructive" : "text-green-600");

  return (
    <Card className={cn("flex flex-col min-w-0", managerView && "h-full overflow-hidden")}>
      <div className={cn("p-6 border-b flex items-center justify-between gap-2", managerView && "flex-wrap shrink-0")}>
        <div className={cn("flex items-center gap-4", managerView && "flex-wrap min-w-0 flex-1")}>
          <div className="flex items-center gap-2 min-w-0">
            <Wallet className="h-5 w-5 text-primary shrink-0" />
            <h3 className="text-lg font-semibold truncate">Cash Position</h3>
          </div>
          {!managerView && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
            <SelectTrigger className="h-9 w-[110px] text-sm font-medium">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="z-[100] bg-popover">
              {DAY_OPTIONS.map((d) => (
                <SelectItem key={d} value={String(d)}>
                  {d} days
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="w-9 px-0 shrink-0" onClick={() => query.refetch()} title="Refresh" aria-label="Refresh Cash Position">
            <RefreshCw className={cn("h-4 w-4", query.isFetching && "animate-spin")} />
          </Button>
        </div>
      </div>

      <Table className="table-fixed text-sm font-normal table-compact"
        containerClassName={managerView ? "relative w-full min-h-0 flex-1 overflow-auto" : undefined}>
        <TableHeader>
          <TableRow className="h-11">
            <TableHead className={cn("pl-4", managerView ? "w-[26%]" : "w-[22%]")}>Job</TableHead>
            {!managerView && <TableHead className="w-[8%] text-center">Manager</TableHead>}
            <TableHead className={managerView ? "w-[23%]" : "w-[20%]"}>Bank Account</TableHead>
            <TableHead className={managerView ? "w-[17%]" : "w-[16%]"}>Bank Balance</TableHead>
            <TableHead className={managerView ? "w-[17%]" : "w-[18%]"}>Approved Bills ({days} days)</TableHead>
            <TableHead className={managerView ? "w-[17%]" : "w-[16%]"}>Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {query.isLoading || (managerView && projectsLoading) ? (
            <TableRow className="h-11">
              <TableCell colSpan={managerView ? 5 : 6} className="text-center text-muted-foreground">Loading…</TableCell>
            </TableRow>
          ) : rows.length === 0 ? (
            <TableRow className="h-11">
              <TableCell colSpan={managerView ? 5 : 6} className="text-center text-muted-foreground">No active jobs</TableCell>
            </TableRow>
          ) : (
            rows.map((r) => {
              const net = r2(r.bank_balance - r.approved_due);
              const project = projects.find((item) => item.id === r.project_id);
              const manager = project?.accounting_manager_user;
              const managerInitials = getManagerInitials(manager);
              const managerName = manager
                ? `${manager.first_name} ${manager.last_name}`.trim()
                : "";
              return (
                <TableRow key={r.project_id} className="h-11">
                  <TableCell className="pl-4">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild><span className="block truncate">{shortAddress(r.address)}</span></TooltipTrigger>
                        <TooltipContent>{shortAddress(r.address)}</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                  {!managerView && <TableCell className="text-center">
                    {managerInitials ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-medium">
                              {managerInitials}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>{managerName || "Unknown"}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>}
                  <TableCell>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-muted-foreground shrink-0">{r.account_code || "—"}</span>
                            <span className="truncate">{r.account_name || ""}</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>{[r.account_code, r.account_name].filter(Boolean).join(" ")}</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                  <TableCell className="tabular-nums whitespace-nowrap">{formatCurrency(r.bank_balance)}</TableCell>
                  <TableCell className="tabular-nums whitespace-nowrap">{formatCurrency(r.approved_due)}</TableCell>
                  <TableCell className={cn("tabular-nums whitespace-nowrap", netClass(net))}>
                    {formatCurrency(net)}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
        {rows.length > 0 && (
          <TableFooter>
            <TableRow className="h-11">
              <TableCell className="pl-4 font-semibold">Total</TableCell>
              {!managerView && <TableCell></TableCell>}
              <TableCell></TableCell>
              <TableCell className="tabular-nums font-semibold">{formatCurrency(totBank)}</TableCell>
              <TableCell className="tabular-nums font-semibold">{formatCurrency(totDue)}</TableCell>
              <TableCell className={cn("tabular-nums font-semibold", netClass(totNet))}>
                {formatCurrency(totNet)}
              </TableCell>
            </TableRow>
          </TableFooter>
        )}
      </Table>
    </Card>
  );
}
