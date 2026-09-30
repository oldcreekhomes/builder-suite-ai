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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useProjects } from "@/hooks/useProjects";
import { cn } from "@/lib/utils";

type Row = {
  project_id: string;
  address: string;
  account_code: string | null;
  account_name: string | null;
  bank_balance: number;
  approved_due: number;
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
export function CashPositionCard() {
  const [days, setDays] = useState<number>(10);
  const [searchQuery, setSearchQuery] = useState("");
  const { data: projects = [] } = useProjects();

  const query = useQuery({
    queryKey: ["project-cash-position", days],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("get_project_cash_position", {
        p_days: days,
      });
      if (error) throw error;
      return ((data as any[]) || []).map((r) => ({
        project_id: r.project_id,
        address: r.address,
        account_code: r.account_code,
        account_name: r.account_name,
        bank_balance: Number(r.bank_balance) || 0,
        approved_due: Number(r.approved_due) || 0,
      })) as Row[];
    },
    staleTime: 60_000,
  });

  const allRows = query.data || [];
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
  const totBank = r2(rows.reduce((s, r) => s + r.bank_balance, 0));
  const totDue = r2(rows.reduce((s, r) => s + r.approved_due, 0));
  const totNet = r2(totBank - totDue);

  const netClass = (n: number) => (n < 0 ? "text-destructive" : "text-green-600");

  return (
    <div className="rounded-lg border bg-card flex flex-col">
      <div className="p-4 border-b flex items-center justify-between gap-2">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 min-w-0">
            <Wallet className="h-4 w-4 text-muted-foreground shrink-0" />
            <h3 className="text-lg font-semibold truncate">Cash Position</h3>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
            <SelectTrigger className="h-8 w-[110px] text-xs">
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
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => query.refetch()} title="Refresh">
            <RefreshCw className={cn("h-4 w-4", query.isFetching && "animate-spin")} />
          </Button>
        </div>
      </div>

      <Table className="table-fixed">
        <TableHeader>
          <TableRow className="h-11">
            <TableHead className="w-[22%] pl-4">Job</TableHead>
            <TableHead className="w-[8%] text-center">Manager</TableHead>
            <TableHead className="w-[20%]">Bank Account</TableHead>
            <TableHead className="w-[16%]">Bank Balance</TableHead>
            <TableHead className="w-[18%]">Approved Bills ({days} days)</TableHead>
            <TableHead className="w-[16%]">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {query.isLoading ? (
            <TableRow className="h-11">
              <TableCell colSpan={6} className="text-center text-muted-foreground">Loading…</TableCell>
            </TableRow>
          ) : rows.length === 0 ? (
            <TableRow className="h-11">
              <TableCell colSpan={6} className="text-center text-muted-foreground">No active jobs</TableCell>
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
                  <TableCell className="truncate pl-4 font-medium" title={shortAddress(r.address)}>
                    {shortAddress(r.address)}
                  </TableCell>
                  <TableCell className="text-center">
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
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-muted-foreground shrink-0">{r.account_code ? `${r.account_code}` : "—"}</span>
                      <span className="truncate">{r.account_name || ""}</span>
                    </div>
                  </TableCell>
                  <TableCell className="tabular-nums whitespace-nowrap">{formatCurrency(r.bank_balance)}</TableCell>
                  <TableCell className="tabular-nums whitespace-nowrap">{formatCurrency(r.approved_due)}</TableCell>
                  <TableCell className={cn("tabular-nums whitespace-nowrap font-semibold", netClass(net))}>
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
              <TableCell></TableCell>
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
      <p className="px-4 py-2 text-[11px] text-muted-foreground">
        Approved bills include anything already past due.
      </p>
    </div>
  );
}
