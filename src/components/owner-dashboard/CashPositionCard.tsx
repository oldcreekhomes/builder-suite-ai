import { useMemo, useState } from "react";
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
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type BankBalance = {
  account_id: string;
  code: string;
  name: string;
  is_default_bank: boolean;
  balance: number;
};

const DAY_OPTIONS = [10, 15, 20];

function formatCurrency(value: number) {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * "Cash Position" card — Owner & Accountant dashboards.
 * Column 1: current bank balance (book balance from the general ledger).
 * Column 2: approved (posted) bills coming due within 10/15/20 days.
 * Column 3: balance minus approved bills, green when positive, red when negative.
 */
export function CashPositionCard() {
  const [days, setDays] = useState<number>(10);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  const balancesQuery = useQuery({
    queryKey: ["bank-account-balances"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_bank_account_balances");
      if (error) throw error;
      return (data || []).map((row: any) => ({
        account_id: row.account_id,
        code: row.code,
        name: row.name,
        is_default_bank: !!row.is_default_bank,
        balance: Number(row.balance) || 0,
      })) as BankBalance[];
    },
    staleTime: 60_000,
  });

  const accounts = balancesQuery.data || [];

  const activeAccount = useMemo(() => {
    if (!accounts.length) return null;
    if (selectedAccountId) {
      return accounts.find((a) => a.account_id === selectedAccountId) || accounts[0];
    }
    return accounts.find((a) => a.is_default_bank) || accounts[0];
  }, [accounts, selectedAccountId]);

  const approvedQuery = useQuery({
    queryKey: ["approved-bills-due", days],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_approved_bills_due", {
        p_days: days,
      });
      if (error) throw error;
      return Number(data) || 0;
    },
    staleTime: 60_000,
  });

  const active = activeAccount?.balance ?? 0;
  const approved = approvedQuery.data ?? 0;
  const net = Math.round((active - approved) * 100) / 100;

  const isLoading = balancesQuery.isLoading || approvedQuery.isLoading;

  const refresh = () => {
    balancesQuery.refetch();
    approvedQuery.refetch();
  };

  return (
    <div className="rounded-lg border bg-card flex flex-col">
      <div className="p-4 border-b flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Wallet className="h-4 w-4 text-muted-foreground shrink-0" />
          <h3 className="text-lg font-semibold truncate">Cash Position</h3>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={refresh}
          title="Refresh"
        >
          <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
        </Button>
      </div>

      <div className="p-4 flex flex-col gap-3">
        {accounts.length > 1 && (
          <Select
            value={activeAccount?.account_id || ""}
            onValueChange={setSelectedAccountId}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Select bank account" />
            </SelectTrigger>
            <SelectContent className="z-[100] bg-popover">
              {accounts.map((a) => (
                <SelectItem key={a.account_id} value={a.account_id}>
                  {a.code} - {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <div className="grid grid-cols-3 gap-2">
          <div className="min-w-0">
            <div className="text-xs text-muted-foreground truncate">
              {activeAccount ? activeAccount.name : "Active Amount"}
            </div>
            <div className="mt-1 text-sm font-semibold tabular-nums">
              {formatCurrency(active)}
            </div>
          </div>

          <div className="min-w-0">
            <Select
              value={String(days)}
              onValueChange={(v) => setDays(Number(v))}
            >
              <SelectTrigger className="h-6 px-1 text-xs border-0 shadow-none focus:ring-0 text-muted-foreground">
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
            <div className="mt-1 text-sm font-semibold tabular-nums">
              {formatCurrency(approved)}
            </div>
          </div>

          <div className="min-w-0">
            <div className="text-xs text-muted-foreground truncate">Total</div>
            <div
              className={cn(
                "mt-1 text-sm font-semibold tabular-nums",
                net < 0 ? "text-destructive" : "text-green-600"
              )}
            >
              {formatCurrency(net)}
            </div>
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground">
          Approved bills include anything already past due.
        </p>
      </div>
    </div>
  );
}
