import { useState, useEffect, useMemo, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRows } from "@/lib/supabasePaginate";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AccountDetailDialog } from "@/components/accounting/AccountDetailDialog";
import { format } from "date-fns";
import { CalendarIcon, ChevronRight, ChevronDown } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { compareCostCodes } from "@/lib/costCodeSort";
import { groupAccountsByParent } from "@/lib/accountHierarchy";
import { useProjectAccountNames } from "@/hooks/useProjectAccountNames";

interface AccountBalance {
  id: string;
  code: string;
  name: string;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  balance: number;
  parent_id?: string | null;
}

interface BalanceSheetData {
  assets: {
    current: AccountBalance[];
    fixed: AccountBalance[];
  };
  liabilities: {
    current: AccountBalance[];
    longTerm: AccountBalance[];
  };
  equity: AccountBalance[];
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
}

interface BalanceSheetContentProps {
  projectId?: string;
  onHeaderActionChange?: (actions: ReactNode) => void;
  asOfDate: Date;
  onAsOfDateChange: (date: Date) => void;
}

export function BalanceSheetContent({ projectId, onHeaderActionChange, asOfDate, onAsOfDateChange }: BalanceSheetContentProps) {
  const { user, session, loading: authLoading } = useAuth();
  const [selectedAccount, setSelectedAccount] = useState<AccountBalance | null>(null);
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());
  const { data: nameOverrides } = useProjectAccountNames(projectId);
  
  const { data: balanceSheetData, isLoading, error } = useQuery({
    queryKey: ['balance-sheet', user?.id, projectId, asOfDate.toISOString().split('T')[0]],
    queryFn: async (): Promise<BalanceSheetData> => {
      console.log("🔍 Balance Sheet: Starting query with user:", user?.email, "project:", projectId || 'Old Creek Homes');
      
      // Fetch accounts and exclusions in parallel
      const [accountsResult, exclusionsResult] = await Promise.all([
        supabase
          .from('accounts')
          .select('id, code, name, type, is_active, parent_id')
          .eq('is_active', true)
          .or(projectId ? `project_id.is.null,project_id.eq.${projectId}` : 'project_id.is.null'),
        projectId
          ? supabase
              .from('project_account_exclusions')
              .select('account_id')
              .eq('project_id', projectId)
          : Promise.resolve({ data: [], error: null }),
      ]);

      const { data: accounts, error: accountsError } = accountsResult;
      if (accountsError) {
        console.error("🔍 Balance Sheet: Accounts query failed:", accountsError);
        throw accountsError;
      }
      if (exclusionsResult.error) throw exclusionsResult.error;

      const excludedAccountIds = new Set(
        (exclusionsResult.data || []).map((e: { account_id: string }) => e.account_id)
      );

      // Filter out excluded accounts. Exclusions are honored for income statement
      // accounts (revenue/expense), but on the Balance Sheet we must NEVER hide a
      // balance sheet account (asset/liability/equity) that has activity — doing so
      // would break the accounting equation (Assets = Liabilities + Equity).
      // We finalize this after computing balances below; for now keep all accounts
      // and re-filter only zero-balance excluded balance-sheet accounts later.

      if (accountsError) {
        console.error("🔍 Balance Sheet: Accounts query failed:", accountsError);
        throw accountsError;
      }

      console.time('⏱️ Balance Sheet: Journal lines query');
      
      // Format date for query - used for both entry_date filter and as-of-aware reversal filtering
      const formattedAsOfDate = asOfDate.toISOString().split('T')[0];
      
      const buildJournalQuery = () => {
        let q = supabase
          .from('journal_entry_lines')
          .select(`
            account_id,
            debit,
            credit,
            journal_entries!inner(entry_date, reversed_at, reversed_by_id, source_type, source_id)
          `)
          .lte('journal_entries.entry_date', formattedAsOfDate)
          .eq('journal_entries.is_reversal', false)
          .is('journal_entries.reversed_by_id', null)
          .or(`reversed_at.is.null,reversed_at.gt.${formattedAsOfDate}`, { referencedTable: 'journal_entries' });

        if (projectId) {
          q = q.eq('project_id', projectId);
        } else {
          q = q.is('project_id', null);
        }
        return q;
      };

      // Fetch consolidated bill payments — these are stored in bill_payments and
      // their individual per-bill journal lines must be SUPPRESSED in favor of the
      // single consolidated total, exactly like the Account Detail dialog does.
      const buildConsolidatedPaymentsQuery = () => {
        let q = supabase
          .from('bill_payments')
          .select('id, payment_account_id, total_amount')
          .lte('payment_date', formattedAsOfDate);
        if (projectId) {
          q = q.eq('project_id', projectId);
        } else {
          q = q.is('project_id', null);
        }
        return q;
      };

      const [journalLines, consolidatedPayments] = await Promise.all([
        fetchAllRows(buildJournalQuery),
        fetchAllRows(buildConsolidatedPaymentsQuery),
      ]);
      console.timeEnd('⏱️ Balance Sheet: Journal lines query');

      // Build the set of bill_ids that participate in consolidated payments.
      const consolidatedPaymentIds = (consolidatedPayments || []).map((p: any) => p.id);
      const consolidatedBillIds = new Set<string>();
      if (consolidatedPaymentIds.length > 0) {
        const allocations = await fetchAllRows(() =>
          supabase
            .from('bill_payment_allocations')
            .select('bill_id, bill_payment_id')
            .in('bill_payment_id', consolidatedPaymentIds)
        );
        (allocations || []).forEach((a: any) => consolidatedBillIds.add(a.bill_id));
      }

      console.log(`📊 Balance Sheet: Processing ${journalLines?.length || 0} journal lines`);

      const accountBalances: Record<string, number> = {};
      const accountsPayableAccountId = accounts?.find((account) =>
        account.type === 'liability' &&
        (account.code === '2010' || account.name.toLowerCase().includes('accounts payable'))
      )?.id;
      const roundCurrency = (amount: number) => Math.round(amount * 100) / 100;

      journalLines?.forEach((line: any) => {
        // Suppress per-bill bill_payment lines whose bill is part of a consolidated payment.
        // The consolidated payment is added back below as a single credit on the
        // payment_account_id and a matching debit to Accounts Payable.
        const je = line.journal_entries;
        if (
          je?.source_type === 'bill_payment' &&
          je?.source_id &&
          consolidatedBillIds.has(je.source_id)
        ) {
          return;
        }
        if (!accountBalances[line.account_id]) {
          accountBalances[line.account_id] = 0;
        }
        accountBalances[line.account_id] += (line.debit || 0) - (line.credit || 0);
      });

      // Apply each consolidated bill payment as a balanced replacement entry:
      // credit the bank/payment account and debit Accounts Payable.
      (consolidatedPayments || []).forEach((p: any) => {
        if (!p.payment_account_id) return;
        const amount = Number(p.total_amount || 0);
        if (!accountBalances[p.payment_account_id]) {
          accountBalances[p.payment_account_id] = 0;
        }
        accountBalances[p.payment_account_id] = roundCurrency(accountBalances[p.payment_account_id] - amount);

        if (accountsPayableAccountId) {
          if (!accountBalances[accountsPayableAccountId]) {
            accountBalances[accountsPayableAccountId] = 0;
          }
          accountBalances[accountsPayableAccountId] = roundCurrency(accountBalances[accountsPayableAccountId] + amount);
        }
      });

      const assets: { current: AccountBalance[], fixed: AccountBalance[] } = { current: [], fixed: [] };
      const liabilities: { current: AccountBalance[], longTerm: AccountBalance[] } = { current: [], longTerm: [] };
      const equity: AccountBalance[] = [];

      let revenueBalance = 0;
      let expenseBalance = 0;

      accounts?.forEach((account) => {
        // For balance-sheet accounts, only honor exclusion if the account has no activity.
        // Hiding a non-zero asset/liability/equity would break Assets = Liabilities + Equity.
        const rawBal = accountBalances[account.id] || 0;
        if (
          projectId &&
          excludedAccountIds.has(account.id) &&
          (account.type === 'revenue' || account.type === 'expense' || Math.abs(rawBal) < 0.005)
        ) {
          return;
        }
        const rawBalance = accountBalances[account.id] || 0;
        let displayBalance = rawBalance;
        
        switch (account.type) {
          case 'asset':
            displayBalance = rawBalance;
            const assetBalance: AccountBalance = {
              id: account.id,
              code: account.code,
              name: account.name,
              type: account.type,
              balance: displayBalance,
              parent_id: account.parent_id,
            };
            assets.current.push(assetBalance);
            break;
            
          case 'liability':
            displayBalance = -rawBalance;
            const liabilityBalance: AccountBalance = {
              id: account.id,
              code: account.code,
              name: account.name,
              type: account.type,
              balance: displayBalance,
              parent_id: account.parent_id,
            };
            liabilities.current.push(liabilityBalance);
            break;
            
          case 'equity':
            displayBalance = -rawBalance;
            const equityBalance: AccountBalance = {
              id: account.id,
              code: account.code,
              name: account.name,
              type: account.type,
              balance: displayBalance,
              parent_id: account.parent_id,
            };
            equity.push(equityBalance);
            break;
            
          case 'revenue':
            revenueBalance += -rawBalance;
            break;
            
          case 'expense':
            expenseBalance += rawBalance;
            break;
        }
      });

      const netIncome = revenueBalance - expenseBalance;
      if (netIncome !== 0) {
        equity.push({
          id: 'retained-earnings-current',
          code: 'RE-CY',
          name: 'Current Year Earnings',
          type: 'equity',
          balance: netIncome
        });
      }

      // Sort all account arrays by account code
      assets.current.sort(compareCostCodes);
      assets.fixed.sort(compareCostCodes);
      liabilities.current.sort(compareCostCodes);
      liabilities.longTerm.sort(compareCostCodes);
      equity.sort(compareCostCodes);

      const totalAssets = [...assets.current, ...assets.fixed].reduce((sum, acc) => sum + acc.balance, 0);
      const totalLiabilities = [...liabilities.current, ...liabilities.longTerm].reduce((sum, acc) => sum + acc.balance, 0);
      const totalEquity = equity.reduce((sum, acc) => sum + acc.balance, 0);

      return {
        assets,
        liabilities,
        equity,
        totalAssets,
        totalLiabilities,
        totalEquity
      };
    },
    enabled: !!user && !!session && !authLoading,
    retry: (failureCount, error: any) => {
      if (error?.code === 'PGRST301' || error?.message?.includes('row-level security')) {
        console.error("🔍 Balance Sheet: RLS policy violation, user needs to re-authenticate");
        return false;
      }
      return failureCount < 3;
    }
  });

  const applyOverrides = (list: AccountBalance[] | undefined): AccountBalance[] =>
    (list || []).map((a) => ({ ...a, name: nameOverrides?.get(a.id) ?? a.name }));

  const displayData = useMemo(() => {
    if (!balanceSheetData) return balanceSheetData;
    return {
      ...balanceSheetData,
      assets: {
        current: applyOverrides(balanceSheetData.assets.current),
        fixed: applyOverrides(balanceSheetData.assets.fixed),
      },
      liabilities: {
        current: applyOverrides(balanceSheetData.liabilities.current),
        longTerm: applyOverrides(balanceSheetData.liabilities.longTerm),
      },
      equity: applyOverrides(balanceSheetData.equity),
    };
  }, [balanceSheetData, nameOverrides]);

  const formatCurrency = (amount: number) => {
    const normalized = Math.abs(amount) < 0.005 ? 0 : amount;
    const value = Object.is(normalized, -0) ? 0 : normalized;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value);
  };

  if (authLoading) {
    return (
      <div className="space-y-4">
      <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-20" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-4 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-4 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    console.error("🔍 Balance Sheet: Query error:", error);
    return (
      <div className="space-y-4">
      <Card>
          <CardContent className="p-6">
            <p className="text-destructive">Error loading balance sheet data.</p>
            {error?.code === 'PGRST301' || error?.message?.includes('row-level security') ? (
              <p className="text-sm text-muted-foreground mt-2">
                Authentication issue detected. Please refresh the page and try again.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground mt-2">
                {error?.message || 'An unexpected error occurred'}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleCloseDialog = () => {
    setSelectedAccount(null);
  };

  const toggleExpanded = (id: string) => {
    setExpandedAccounts(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const renderHierarchicalAccounts = (
    accountsList: AccountBalance[],
    onSelect: (account: AccountBalance) => void,
    fmt: (amount: number) => string
  ) => {
    const { roots, childrenMap } = groupAccountsByParent(accountsList);
    const elements: JSX.Element[] = [];
    for (const root of roots) {
      const children = childrenMap[root.id] || [];
      const hasChildren = children.length > 0;
      const isExpanded = expandedAccounts.has(root.id);
      const rolledUpBalance = hasChildren
        ? root.balance + children.reduce((sum, c) => sum + c.balance, 0)
        : root.balance;

      elements.push(
        <div
          key={root.id}
          className="flex justify-between items-center text-sm hover:bg-muted/50 p-2 rounded transition-colors"
        >
          <span className="flex items-center gap-1 flex-1 min-w-0">
            {hasChildren && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); toggleExpanded(root.id); }}
                className="flex items-center justify-center hover:bg-muted rounded p-0.5"
                aria-label={isExpanded ? "Collapse" : "Expand"}
              >
                {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
              </button>
            )}
            <span className="cursor-pointer flex-1" onClick={() => onSelect(root)}>
              {root.code}: {root.name}
            </span>
          </span>
          <span className="cursor-pointer" onClick={() => onSelect(root)}>
            {fmt(isExpanded ? root.balance : rolledUpBalance)}
          </span>
        </div>
      );
      if (hasChildren && isExpanded) {
        for (const child of children) {
          elements.push(
            <div
              key={child.id}
              className="flex justify-between items-center text-sm cursor-pointer hover:bg-muted/50 p-2 pl-8 rounded transition-colors"
              onClick={() => onSelect(child)}
            >
              <span className="text-muted-foreground">↳ {child.code}: {child.name}</span>
              <span>{fmt(child.balance)}</span>
            </div>
          );
        }
      }
    }
    return elements;
  };

  // Emit date picker to header via bridge
  useEffect(() => {
    if (onHeaderActionChange) {
      onHeaderActionChange(
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-auto justify-start text-left font-normal">
              <CalendarIcon className="mr-2 h-4 w-4" />
              As of {format(asOfDate, "PPP")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={asOfDate}
              defaultMonth={asOfDate}
              onSelect={(date) => date && onAsOfDateChange(date)}
              initialFocus
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      );
      return () => onHeaderActionChange(null);
    }
  }, [onHeaderActionChange, asOfDate, onAsOfDateChange]);

  const toolbarInContent = !onHeaderActionChange ? (
    <div className="flex items-center justify-end">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-auto justify-start text-left font-normal">
            <CalendarIcon className="mr-2 h-4 w-4" />
            As of {format(asOfDate, "PPP")}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="single"
            selected={asOfDate}
            defaultMonth={asOfDate}
            onSelect={(date) => date && onAsOfDateChange(date)}
            initialFocus
            className="pointer-events-auto"
          />
        </PopoverContent>
      </Popover>
    </div>
  ) : null;

  return (
    <div className="space-y-4">
      {toolbarInContent}

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-20" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-4 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-4 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Assets</CardTitle>
              </CardHeader>
              <CardContent>
                {displayData?.assets.current && displayData.assets.current.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-semibold mb-3 text-sm">Current Assets</h4>
                    <div className="space-y-2">
                      {renderHierarchicalAccounts(displayData.assets.current, setSelectedAccount, formatCurrency)}
                    </div>
                  </div>
                )}

                {displayData?.assets.fixed && displayData.assets.fixed.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-semibold mb-3 text-sm">Fixed Assets</h4>
                    <div className="space-y-2">
                      {renderHierarchicalAccounts(displayData.assets.fixed, setSelectedAccount, formatCurrency)}
                    </div>
                  </div>
                )}

                <div className="border-t pt-3 mt-4">
                  <div className="flex justify-between items-center font-semibold px-2">
                    <span>Total Assets</span>
                    <span>{formatCurrency(displayData?.totalAssets || 0)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Liabilities & Equity</CardTitle>
              </CardHeader>
              <CardContent>
                {displayData?.liabilities.current && displayData.liabilities.current.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-semibold mb-3 text-sm">Current Liabilities</h4>
                    <div className="space-y-2">
                      {renderHierarchicalAccounts(displayData.liabilities.current, setSelectedAccount, formatCurrency)}
                    </div>
                  </div>
                )}

                {displayData?.liabilities.longTerm && displayData.liabilities.longTerm.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-semibold mb-3 text-sm">Long-term Liabilities</h4>
                    <div className="space-y-2">
                      {renderHierarchicalAccounts(displayData.liabilities.longTerm, setSelectedAccount, formatCurrency)}
                    </div>
                  </div>
                )}

                <div className="border-t pt-3 mt-4 mb-6">
                  <div className="flex justify-between items-center font-semibold px-2">
                    <span>Total Liabilities</span>
                    <span>{formatCurrency(displayData?.totalLiabilities || 0)}</span>
                  </div>
                </div>

                {displayData?.equity && displayData.equity.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-semibold mb-3 text-sm">Equity</h4>
                    <div className="space-y-2">
                      {renderHierarchicalAccounts(displayData.equity, setSelectedAccount, formatCurrency)}
                    </div>
                  </div>
                )}

                <div className="border-t pt-3 mt-4 mb-6">
                  <div className="flex justify-between items-center font-semibold px-2">
                    <span>Total Equity</span>
                    <span>{formatCurrency(displayData?.totalEquity || 0)}</span>
                  </div>
                </div>

                <div className="border-t-2 pt-3">
                  <div className="flex justify-between items-center font-bold px-2">
                    <span>Total Liabilities & Equity</span>
                    <span>{formatCurrency((displayData?.totalLiabilities || 0) + (displayData?.totalEquity || 0))}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      <AccountDetailDialog
        accountId={selectedAccount?.id || null}
        accountCode={selectedAccount?.code || ''}
        accountName={selectedAccount ? (nameOverrides?.get(selectedAccount.id) ?? selectedAccount.name) : ''}
        accountType={selectedAccount?.type || 'asset'}
        projectId={projectId}
        asOfDate={asOfDate}
        open={!!selectedAccount}
        onOpenChange={(open) => !open && handleCloseDialog()}
      />
    </div>
  );
}
