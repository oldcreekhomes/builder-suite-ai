import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Wallet, RefreshCw } from "lucide-react";
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

function shortAddress(a: string) {
  return (a || "").split(",")[0];
}

/**
 * Cash Position — one row per active job:
 * Job | Bank account + job balance | Approved bills due in N days | Balance − bills
 */
export function CashPositionCard() {
  const [days, setDays] = useState<number>(10);

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

  const rows = query.data || [];
  const totBank = r2(rows.reduce((s, r) => s + r.bank_balance, 0));
  const totDue = r2(rows.reduce((s, r) => s + r.approved_due, 0));
  const totNet = r2(totBank - totDue);

  const netClass = (n: number) => (n < 0 ? "text-destructive" : "text-green-600");

  return (
    <div className="rounded-lg border bg-card flex flex-col">
      <div className="p-4 border-b flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Wallet className="h-4 w-4 text-muted-foreground shrink-0" />
          <h3 className="text-lg font-semibold truncate">Cash Position</h3>
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
            <TableHead className="w-[28%]">Job</TableHead>
            <TableHead className="w-[26%]">Bank Account</TableHead>
            <TableHead className="w-[23%] text-right">Approved Bills ({days} days)</TableHead>
            <TableHead className="w-[23%] text-right">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {query.isLoading ? (
            <TableRow className="h-11">
              <TableCell colSpan={4} className="text-center text-muted-foreground">Loading…</TableCell>
            </TableRow>
          ) : rows.length === 0 ? (
            <TableRow className="h-11">
              <TableCell colSpan={4} className="text-center text-muted-foreground">No active jobs</TableCell>
            </TableRow>
          ) : (
            rows.map((r) => {
              const net = r2(r.bank_balance - r.approved_due);
              return (
                <TableRow key={r.project_id} className="h-11">
                  <TableCell className="truncate font-medium">{shortAddress(r.address)}</TableCell>
                  <TableCell className="truncate">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-muted-foreground">
                        {r.account_code ? `${r.account_code} ${r.account_name}` : "—"}
                      </span>
                      <span className="tabular-nums">{formatCurrency(r.bank_balance)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(r.approved_due)}</TableCell>
                  <TableCell className={cn("text-right tabular-nums font-semibold", netClass(net))}>
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
              <TableCell className="font-semibold">Total</TableCell>
              <TableCell className="text-right tabular-nums font-semibold">{formatCurrency(totBank)}</TableCell>
              <TableCell className="text-right tabular-nums font-semibold">{formatCurrency(totDue)}</TableCell>
              <TableCell className={cn("text-right tabular-nums font-semibold", netClass(totNet))}>
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
