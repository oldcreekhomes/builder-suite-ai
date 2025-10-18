import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AccountDetailDialog } from "@/components/accounting/AccountDetailDialog";

interface AccountBalance {
  id: string;
  code: string;
  name: string;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  balance: number;
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
}

export function BalanceSheetContent({ projectId }: BalanceSheetContentProps) {
  const { user, session, loading: authLoading } = useAuth();
  const [selectedAccount, setSelectedAccount] = useState<AccountBalance | null>(null);
  
  const { data: balanceSheetData, isLoading, error } = useQuery({
    queryKey: ['balance-sheet', user?.id, projectId],
    queryFn: async (): Promise<BalanceSheetData> => {
      console.log("🔍 Balance Sheet: Starting query with user:", user?.email, "project:", projectId || 'Old Creek Homes');
      const { data: accounts, error: accountsError } = await supabase
        .from('accounts')
        .select('id, code, name, type, is_active')
        .eq('is_active', true);

      if (accountsError) {
        console.error("🔍 Balance Sheet: Accounts query failed:", accountsError);
        throw accountsError;
      }

      console.time('⏱️ Balance Sheet: Journal lines query');
      
      let journalLinesQuery = supabase
        .from('journal_entry_lines')
        .select('account_id, debit, credit');
      
      if (projectId) {
        journalLinesQuery = journalLinesQuery.eq('project_id', projectId);
      } else {
        journalLinesQuery = journalLinesQuery.is('project_id', null);
      }

      const { data: journalLines, error: journalError } = await journalLinesQuery;
      console.timeEnd('⏱️ Balance Sheet: Journal lines query');
      
      if (journalError) {
        console.error("🔍 Balance Sheet: Journal lines query failed:", journalError);
        throw journalError;
      }
      
      console.log(`📊 Balance Sheet: Processing ${journalLines?.length || 0} journal lines`);

      const accountBalances: Record<string, number> = {};
      
      journalLines?.forEach((line) => {
        if (!accountBalances[line.account_id]) {
          accountBalances[line.account_id] = 0;
        }
        accountBalances[line.account_id] += (line.debit || 0) - (line.credit || 0);
      });

      const assets: { current: AccountBalance[], fixed: AccountBalance[] } = { current: [], fixed: [] };
      const liabilities: { current: AccountBalance[], longTerm: AccountBalance[] } = { current: [], longTerm: [] };
      const equity: AccountBalance[] = [];

      let revenueBalance = 0;
      let expenseBalance = 0;

      accounts?.forEach((account) => {
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
              balance: displayBalance
            };
            assets.current.push(assetBalance);
            break;
            
          case 'liability':
            displayBalance = Math.abs(rawBalance);
            const liabilityBalance: AccountBalance = {
              id: account.id,
              code: account.code,
              name: account.name,
              type: account.type,
              balance: displayBalance
            };
            liabilities.current.push(liabilityBalance);
            break;
            
          case 'equity':
            displayBalance = Math.abs(rawBalance);
            const equityBalance: AccountBalance = {
              id: account.id,
              code: account.code,
              name: account.name,
              type: account.type,
              balance: displayBalance
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

      const totalAssets = [...assets.current, ...assets.fixed].reduce((sum, acc) => sum + acc.balance, 0);
      const totalLiabilities = [...liabilities.current, ...liabilities.longTerm].reduce((sum, acc) => sum + acc.balance, 0);
      const totalEquity = equity.reduce((sum, acc) => sum + acc.balance, 0);

      const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;
      const difference = totalAssets - totalLiabilitiesAndEquity;
      
      if (Math.abs(difference) > 0.01) {
        equity.push({
          id: 'balance-sheet-difference',
          code: 'DIFF',
          name: 'Balance Sheet Difference (Investigation Required)',
          type: 'equity',
          balance: difference
        });
      }

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
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">
            Balance Sheet <span className="text-sm text-muted-foreground font-normal ml-4">As of {new Date().toLocaleDateString()}</span>
          </h2>
        </div>
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
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">
            Balance Sheet <span className="text-sm text-muted-foreground font-normal ml-4">As of {new Date().toLocaleDateString()}</span>
          </h2>
        </div>
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">
          Balance Sheet <span className="text-sm text-muted-foreground font-normal ml-4">As of {new Date().toLocaleDateString()}</span>
        </h2>
      </div>

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
                {balanceSheetData?.assets.current && balanceSheetData.assets.current.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-semibold mb-3 text-sm">Current Assets</h4>
                    <div className="space-y-2">
                      {balanceSheetData.assets.current.map((account) => (
                        <div 
                          key={account.id} 
                          className="flex justify-between items-center text-sm cursor-pointer hover:bg-muted/50 p-2 rounded transition-colors"
                          onClick={() => setSelectedAccount(account)}
                        >
                          <span>{account.code}: {account.name}</span>
                          <span>{formatCurrency(account.balance)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {balanceSheetData?.assets.fixed && balanceSheetData.assets.fixed.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-semibold mb-3 text-sm">Fixed Assets</h4>
                    <div className="space-y-2">
                      {balanceSheetData.assets.fixed.map((account) => (
                        <div 
                          key={account.id} 
                          className="flex justify-between items-center text-sm cursor-pointer hover:bg-muted/50 p-2 rounded transition-colors"
                          onClick={() => setSelectedAccount(account)}
                        >
                          <span>{account.code}: {account.name}</span>
                          <span>{formatCurrency(account.balance)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="border-t pt-3 mt-4">
                  <div className="flex justify-between items-center font-semibold px-2">
                    <span>Total Assets</span>
                    <span>{formatCurrency(balanceSheetData?.totalAssets || 0)}</span>
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
                {balanceSheetData?.liabilities.current && balanceSheetData.liabilities.current.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-semibold mb-3 text-sm">Current Liabilities</h4>
                    <div className="space-y-2">
                      {balanceSheetData.liabilities.current.map((account) => (
                        <div 
                          key={account.id} 
                          className="flex justify-between items-center text-sm cursor-pointer hover:bg-muted/50 p-2 rounded transition-colors"
                          onClick={() => setSelectedAccount(account)}
                        >
                          <span>{account.code}: {account.name}</span>
                          <span>{formatCurrency(account.balance)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {balanceSheetData?.liabilities.longTerm && balanceSheetData.liabilities.longTerm.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-semibold mb-3 text-sm">Long-term Liabilities</h4>
                    <div className="space-y-2">
                      {balanceSheetData.liabilities.longTerm.map((account) => (
                        <div 
                          key={account.id} 
                          className="flex justify-between items-center text-sm cursor-pointer hover:bg-muted/50 p-2 rounded transition-colors"
                          onClick={() => setSelectedAccount(account)}
                        >
                          <span>{account.code}: {account.name}</span>
                          <span>{formatCurrency(account.balance)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="border-t pt-3 mt-4 mb-6">
                  <div className="flex justify-between items-center font-semibold px-2">
                    <span>Total Liabilities</span>
                    <span>{formatCurrency(balanceSheetData?.totalLiabilities || 0)}</span>
                  </div>
                </div>

                {balanceSheetData?.equity && balanceSheetData.equity.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-semibold mb-3 text-sm">Equity</h4>
                    <div className="space-y-2">
                      {balanceSheetData.equity.map((account) => (
                        <div 
                          key={account.id} 
                          className="flex justify-between items-center text-sm cursor-pointer hover:bg-muted/50 p-2 rounded transition-colors"
                          onClick={() => setSelectedAccount(account)}
                        >
                          <span>{account.code}: {account.name}</span>
                          <span>{formatCurrency(account.balance)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="border-t pt-3 mt-4 mb-6">
                  <div className="flex justify-between items-center font-semibold px-2">
                    <span>Total Equity</span>
                    <span>{formatCurrency(balanceSheetData?.totalEquity || 0)}</span>
                  </div>
                </div>

                <div className="border-t-2 pt-3">
                  <div className="flex justify-between items-center font-bold px-2">
                    <span>Total Liabilities & Equity</span>
                    <span>{formatCurrency((balanceSheetData?.totalLiabilities || 0) + (balanceSheetData?.totalEquity || 0))}</span>
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
        accountName={selectedAccount?.name || ''}
        accountType={selectedAccount?.type || 'asset'}
        projectId={projectId}
        open={!!selectedAccount}
        onOpenChange={(open) => !open && handleCloseDialog()}
      />
    </div>
  );
}
