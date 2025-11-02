import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AccountDetailDialog } from "@/components/accounting/AccountDetailDialog";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

interface AccountBalance {
  id: string;
  code: string;
  name: string;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  balance: number;
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
}

export function IncomeStatementContent({ projectId }: IncomeStatementContentProps) {
  const { user, session, loading: authLoading } = useAuth();
  const [selectedAccount, setSelectedAccount] = useState<AccountBalance | null>(null);
  const [asOfDate, setAsOfDate] = useState<Date>(new Date());
  
  const { data: incomeStatementData, isLoading, error } = useQuery({
    queryKey: ['income-statement', user?.id, projectId, asOfDate.toISOString().split('T')[0]],
    queryFn: async (): Promise<IncomeStatementData> => {
      console.log("🔍 Income Statement: Starting query with user:", user?.email, "project:", projectId || 'Old Creek Homes');
      
      const { data: accounts, error: accountsError } = await supabase
        .from('accounts')
        .select('id, code, name, type, is_active')
        .eq('is_active', true)
        .in('type', ['revenue', 'expense']);

      if (accountsError) {
        console.error("🔍 Income Statement: Accounts query failed:", accountsError);
        throw accountsError;
      }

      console.time('⏱️ Income Statement: Journal lines query');
      
      let journalLinesQuery = supabase
        .from('journal_entry_lines')
        .select(`
          account_id,
          debit,
          credit,
          journal_entries!inner(entry_date)
        `)
        .lte('journal_entries.entry_date', asOfDate.toISOString().split('T')[0]);
      
      if (projectId) {
        journalLinesQuery = journalLinesQuery.or(`project_id.eq.${projectId},project_id.is.null`);
      } else {
        journalLinesQuery = journalLinesQuery.is('project_id', null);
      }

      const { data: journalLines, error: journalError } = await journalLinesQuery;
      console.timeEnd('⏱️ Income Statement: Journal lines query');
      
      if (journalError) {
        console.error("🔍 Income Statement: Journal lines query failed:", journalError);
        throw journalError;
      }
      
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

      accounts?.forEach((account) => {
        const rawBalance = accountBalances[account.id] || 0;
        
        if (account.type === 'revenue') {
          const displayBalance = -rawBalance;
          revenue.push({
            id: account.id,
            code: account.code,
            name: account.name,
            type: account.type,
            balance: displayBalance
          });
        } else if (account.type === 'expense') {
          const displayBalance = rawBalance;
          expenses.push({
            id: account.id,
            code: account.code,
            name: account.name,
            type: account.type,
            balance: displayBalance
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
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">
            Income Statement <span className="text-sm text-muted-foreground font-normal ml-4">As of {new Date().toLocaleDateString()}</span>
          </h2>
        </div>
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
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">
            Income Statement <span className="text-sm text-muted-foreground font-normal ml-4">As of {new Date().toLocaleDateString()}</span>
          </h2>
        </div>
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Income Statement</h2>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-[240px] justify-start text-left font-normal">
              <CalendarIcon className="mr-2 h-4 w-4" />
              As of {format(asOfDate, "PPP")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={asOfDate}
              onSelect={(date) => date && setAsOfDate(date)}
              initialFocus
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>

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
            <CardHeader>
              <CardTitle>Income Statement</CardTitle>
            </CardHeader>
            <CardContent>
              {incomeStatementData?.revenue && incomeStatementData.revenue.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-semibold mb-3 text-sm">Revenue</h4>
                  <div className="space-y-2">
                    {incomeStatementData.revenue.map((account) => (
                      <div 
                        key={account.id} 
                        className="flex justify-between items-center text-sm cursor-pointer hover:bg-muted/50 p-2 rounded transition-colors"
                        onClick={() => setSelectedAccount(account)}
                      >
                        <span>{account.code} - {account.name}</span>
                        <span>{formatCurrency(account.balance)}</span>
                      </div>
                    ))}
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
                    {incomeStatementData.expenses.map((account) => (
                      <div 
                        key={account.id} 
                        className="flex justify-between items-center text-sm cursor-pointer hover:bg-muted/50 p-2 rounded transition-colors"
                        onClick={() => setSelectedAccount(account)}
                      >
                        <span>{account.code} - {account.name}</span>
                        <span>{formatCurrency(account.balance)}</span>
                      </div>
                    ))}
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
