import { useState, useEffect, ReactNode } from "react";
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
import { groupAccountsByParent } from "@/lib/accountHierarchy";

interface AccountBalance {
  id: string;
  code: string;
  name: string;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  balance: number;
  parent_id?: string | null;
}

interface IncomeStatementData {
  revenue: AccountBalance[];
  expenses: AccountBalance[];
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
}

interface IncomeStatementContentProps {
  projectId?: string;
  onHeaderActionChange?: (actions: ReactNode) => void;
  asOfDate: Date;
  onAsOfDateChange: (date: Date) => void;
}

export function IncomeStatementContent({ projectId, onHeaderActionChange, asOfDate, onAsOfDateChange }: IncomeStatementContentProps) {
  const { user, session, loading: authLoading } = useAuth();
  const [selectedAccount, setSelectedAccount] = useState<AccountBalance | null>(null);
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());
  
  const { data: incomeStatementData, isLoading, error } = useQuery({
    queryKey: ['income-statement', user?.id, projectId, asOfDate.toISOString().split('T')[0]],
    queryFn: async (): Promise<IncomeStatementData> => {
      console.log("🔍 Income Statement: Starting query with user:", user?.email, "project:", projectId || 'Old Creek Homes');
      
      // Fetch accounts and exclusions in parallel
      const [accountsResult, exclusionsResult] = await Promise.all([
        supabase
          .from('accounts')
          .select('id, code, name, type, is_active, parent_id')
          .eq('is_active', true)
          .in('type', ['revenue', 'expense']),
        projectId
          ? supabase
              .from('project_account_exclusions')
              .select('account_id')
              .eq('project_id', projectId)
          : Promise.resolve({ data: [], error: null }),
      ]);

      const { data: accounts, error: accountsError } = accountsResult;
      if (accountsError) {
        console.error("🔍 Income Statement: Accounts query failed:", accountsError);
        throw accountsError;
      }
      if (exclusionsResult.error) throw exclusionsResult.error;

      const excludedAccountIds = new Set(
        (exclusionsResult.data || []).map((e: { account_id: string }) => e.account_id)
      );

      const filteredAccounts = projectId
        ? accounts?.filter((a) => !excludedAccountIds.has(a.id))
        : accounts;

      console.time('⏱️ Income Statement: Journal lines query');
      
      const buildJournalQuery = () => {
        let q = supabase
          .from('journal_entry_lines')
          .select(`
            account_id,
            debit,
            credit,
            journal_entries!inner(entry_date)
          `)
          .lte('journal_entries.entry_date', asOfDate.toISOString().split('T')[0]);
        
        if (projectId) {
          q = q.or(`project_id.eq.${projectId},project_id.is.null`);
        } else {
          q = q.is('project_id', null);
        }
        return q;
      };

      const journalLines = await fetchAllRows(buildJournalQuery);
      console.timeEnd('⏱️ Income Statement: Journal lines query');
      
      console.log(`📊 Income Statement: Processing ${journalLines?.length || 0} journal lines`);

      const accountBalances: Record<string, number> = {};
      
      journalLines?.forEach((line) => {
        if (!accountBalances[line.account_id]) {
          accountBalances[line.account_id] = 0;
        }
        accountBalances[line.account_id] += (line.debit || 0) - (line.credit || 0);
      });

      const revenue: AccountBalance[] = [];
      const expenses: AccountBalance[] = [];

      filteredAccounts?.forEach((account) => {
        const rawBalance = accountBalances[account.id] || 0;
        
        if (account.type === 'revenue') {
          const displayBalance = -rawBalance;
          revenue.push({
            id: account.id,
            code: account.code,
            name: account.name,
            type: account.type,
            balance: displayBalance,
            parent_id: account.parent_id,
          });
        } else if (account.type === 'expense') {
          const displayBalance = rawBalance;
          expenses.push({
            id: account.id,
            code: account.code,
            name: account.name,
            type: account.type,
            balance: displayBalance,
            parent_id: account.parent_id,
          });
        }
      });

      const totalRevenue = revenue.reduce((sum, acc) => sum + acc.balance, 0);
      const totalExpenses = expenses.reduce((sum, acc) => sum + acc.balance, 0);
      const netIncome = totalRevenue - totalExpenses;

      return {
        revenue,
        expenses,
        totalRevenue,
        totalExpenses,
        netIncome
      };
    },
    enabled: !!user && !!session && !authLoading,
    retry: (failureCount, error: any) => {
      if (error?.code === 'PGRST301' || error?.message?.includes('row-level security')) {
        console.error("🔍 Income Statement: RLS policy violation, user needs to re-authenticate");
        return false;
      }
      return failureCount < 3;
    }
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  if (authLoading) {
    return (
      <div className="space-y-4">
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
      </div>
    );
  }

  if (error) {
    console.error("🔍 Income Statement: Query error:", error);
    return (
      <div className="space-y-4">
      <Card>
          <CardContent className="p-6">
            <p className="text-destructive">Error loading income statement data.</p>
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
          className="flex justify-between items-center text-sm cursor-pointer hover:bg-muted/50 p-2 rounded transition-colors"
          onClick={() => hasChildren ? toggleExpanded(root.id) : onSelect(root)}
        >
          <span className="flex items-center gap-1">
            {hasChildren && (isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />)}
            {root.code} - {root.name}
          </span>
          <span>{fmt(isExpanded ? root.balance : rolledUpBalance)}</span>
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
              <span className="text-muted-foreground">↳ {child.code} - {child.name}</span>
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
      ) : (
        <div className="max-w-3xl">
          <Card>
            <CardContent className="pt-6">
              {incomeStatementData?.revenue && incomeStatementData.revenue.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-semibold mb-3 text-sm">Revenue</h4>
                  <div className="space-y-2">
                    {renderHierarchicalAccounts(incomeStatementData.revenue, setSelectedAccount, formatCurrency)}
                  </div>
                  <div className="border-t pt-3 mt-4">
                    <div className="flex justify-between items-center font-semibold">
                      <span>Total Revenue</span>
                      <span>{formatCurrency(incomeStatementData?.totalRevenue || 0)}</span>
                    </div>
                  </div>
                </div>
              )}

              {incomeStatementData?.expenses && incomeStatementData.expenses.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-semibold mb-3 text-sm">Expenses</h4>
                  <div className="space-y-2">
                    {renderHierarchicalAccounts(incomeStatementData.expenses, setSelectedAccount, formatCurrency)}
                  </div>
                  <div className="border-t pt-3 mt-4">
                    <div className="flex justify-between items-center font-semibold">
                      <span>Total Expenses</span>
                      <span>{formatCurrency(incomeStatementData?.totalExpenses || 0)}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="border-t-2 border-gray-300 pt-4">
                <div className="flex justify-between items-center font-bold text-lg">
                  <span>Net Income</span>
                  <span className={incomeStatementData && incomeStatementData.netIncome < 0 ? "text-destructive" : ""}>
                    {formatCurrency(incomeStatementData?.netIncome || 0)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <AccountDetailDialog
        accountId={selectedAccount?.id || null}
        accountCode={selectedAccount?.code || ''}
        accountName={selectedAccount?.name || ''}
        accountType={selectedAccount?.type || 'expense'}
        projectId={projectId}
        asOfDate={asOfDate}
        open={!!selectedAccount}
        onOpenChange={(open) => !open && handleCloseDialog()}
      />
    </div>
  );
}
