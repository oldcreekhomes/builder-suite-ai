import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import { CompanyDashboardHeader } from "@/components/CompanyDashboardHeader";
import { DashboardHeader } from "@/components/DashboardHeader";
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

export default function BalanceSheet() {
  const { projectId } = useParams<{ projectId: string }>();
  const { user, session, loading: authLoading } = useAuth();
  const [selectedAccount, setSelectedAccount] = useState<AccountBalance | null>(null);
  
  const { data: balanceSheetData, isLoading, error } = useQuery({
    queryKey: ['balance-sheet', user?.id, projectId],
    queryFn: async (): Promise<BalanceSheetData> => {
      console.log("🔍 Balance Sheet: Starting query with user:", user?.email, "project:", projectId || 'Old Creek Homes');
      // Get only necessary account fields for better performance
      const { data: accounts, error: accountsError } = await supabase
        .from('accounts')
        .select('id, code, name, type, is_active')
        .eq('is_active', true);

      if (accountsError) {
        console.error("🔍 Balance Sheet: Accounts query failed:", accountsError);
        throw accountsError;
      }

      console.time('⏱️ Balance Sheet: Journal lines query');
      
      // Query journal_entry_lines filtered by project_id
      // Since we backfilled project_id for all lines in project-scoped entries,
      // this now correctly includes all lines (expense + job cost) from project journal entries
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

      // Calculate account balances with proper sign conventions
      const accountBalances: Record<string, number> = {};
      
      journalLines?.forEach((line) => {
        if (!accountBalances[line.account_id]) {
          accountBalances[line.account_id] = 0;
        }
        accountBalances[line.account_id] += (line.debit || 0) - (line.credit || 0);
      });

      // Categorize accounts with proper balance sheet presentation
      const assets: { current: AccountBalance[], fixed: AccountBalance[] } = { current: [], fixed: [] };
      const liabilities: { current: AccountBalance[], longTerm: AccountBalance[] } = { current: [], longTerm: [] };
      const equity: AccountBalance[] = [];

      // Track revenue and expense for retained earnings calculation
      let revenueBalance = 0;
      let expenseBalance = 0;

      accounts?.forEach((account) => {
        const rawBalance = accountBalances[account.id] || 0;
        
        // Apply proper accounting sign conventions for balance sheet presentation
        let displayBalance = rawBalance;
        
        switch (account.type) {
          case 'asset':
            // Assets: Debit balances are positive (normal)
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
            // Liabilities: Credit balances are positive for balance sheet presentation
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
            // Equity: Credit balances are positive for balance sheet presentation
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
            // Revenue accounts (credit normal) - accumulate for retained earnings
            revenueBalance += -rawBalance; // Convert to positive for revenue
            break;
            
          case 'expense':
            // Expense accounts (debit normal) - accumulate for retained earnings
            expenseBalance += rawBalance;
            break;
        }
      });

      // Calculate net income and add to retained earnings
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

      // Add balance sheet balancing check
      const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;
      const difference = totalAssets - totalLiabilitiesAndEquity;
      
      // If there's still an imbalance, add a balancing entry to highlight the issue
      if (Math.abs(difference) > 0.01) { // Allow for small rounding differences
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
    enabled: !!user && !!session && !authLoading, // Only run when authenticated
    retry: (failureCount, error: any) => {
      // Don't retry RLS policy violations (usually means auth issue)
      if (error?.code === 'PGRST301' || error?.message?.includes('row-level security')) {
        console.error("🔍 Balance Sheet: RLS policy violation, user needs to re-authenticate");
        return false;
      }
      return failureCount < 3;
    }
  });

  const formatCurrency = (amount: number) => {
    // Normalize tiny values and negative zero for clean display
    const normalized = Math.abs(amount) < 0.005 ? 0 : amount;
    const value = Object.is(normalized, -0) ? 0 : normalized;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value);
  };

  // Show loading while auth is initializing
  if (authLoading) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <AppSidebar />
          <SidebarInset className="flex-1">
            {projectId ? (
              <DashboardHeader 
                title="Balance Sheet" 
                projectId={projectId}
              />
            ) : (
              <CompanyDashboardHeader />
            )}
            <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
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
          </SidebarInset>
        </div>
      </SidebarProvider>
    );
  }

  if (error) {
    console.error("🔍 Balance Sheet: Query error:", error);
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <AppSidebar />
          <SidebarInset className="flex-1">
            {projectId ? (
              <DashboardHeader 
                title="Balance Sheet" 
                projectId={projectId}
              />
            ) : (
              <CompanyDashboardHeader />
            )}
            <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
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
          </SidebarInset>
        </div>
      </SidebarProvider>
    );
  }

  const handleCloseDialog = () => {
    setSelectedAccount(null);
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <SidebarInset className="flex-1">
          {projectId ? (
            <DashboardHeader 
              title="Balance Sheet" 
              projectId={projectId}
            />
          ) : (
            <CompanyDashboardHeader />
          )}
          <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
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
                {/* Assets Column */}
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Assets</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {/* Current Assets */}
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

                      {/* Fixed Assets */}
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

                {/* Liabilities & Equity Column */}
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Liabilities & Equity</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {/* Current Liabilities */}
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

                      {/* Long-term Liabilities */}
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

                      <div className="border-t pt-3 mb-6">
                        <div className="flex justify-between items-center font-semibold text-sm px-2">
                          <span>Total Liabilities</span>
                          <span>{formatCurrency(balanceSheetData?.totalLiabilities || 0)}</span>
                        </div>
                      </div>

                      {/* Equity */}
                      {balanceSheetData?.equity && balanceSheetData.equity.length > 0 && (
                        <div className="mb-6">
                          <h4 className="font-semibold mb-3 text-sm">Equity</h4>
                          <div className="space-y-2">
                            {balanceSheetData.equity.map((account) => (
                              <div 
                                key={account.id} 
                                className={`flex justify-between items-center text-sm ${
                                  account.id.startsWith('retained-earnings') || account.id === 'balance-sheet-difference' 
                                    ? '' 
                                    : 'cursor-pointer hover:bg-muted/50 p-2 rounded transition-colors'
                                }`}
                                onClick={() => {
                                  if (!account.id.startsWith('retained-earnings') && account.id !== 'balance-sheet-difference') {
                                    setSelectedAccount(account);
                                  }
                                }}
                              >
                                <span>{account.code}: {account.name}</span>
                                <span>{formatCurrency(account.balance)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                       <div className="border-t pt-3">
                         <div className="flex justify-between items-center font-semibold px-2">
                           <span>Total Liabilities & Equity</span>
                           <span>{formatCurrency((balanceSheetData?.totalLiabilities || 0) + (balanceSheetData?.totalEquity || 0))}</span>
                         </div>
                       </div>

                        {/* Balance Check */}
                        <div className="border-t-2 border-primary pt-3 mt-4">
                          <div className="flex justify-between items-center font-semibold text-primary px-2">
                            <span>Balance Check</span>
                            <span>
                              {Math.abs((balanceSheetData?.totalAssets || 0) - ((balanceSheetData?.totalLiabilities || 0) + (balanceSheetData?.totalEquity || 0))) < 0.01 
                                ? "✓ Balanced" 
                                : `⚠ Difference: ${formatCurrency((balanceSheetData?.totalAssets || 0) - ((balanceSheetData?.totalLiabilities || 0) + (balanceSheetData?.totalEquity || 0)))}`
                              }
                            </span>
                          </div>
                        </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </div>
        </SidebarInset>
      </div>

      <AccountDetailDialog
        accountId={selectedAccount?.id || null}
        accountCode={selectedAccount?.code || ''}
        accountName={selectedAccount?.name || ''}
        accountType={selectedAccount?.type || 'asset'}
        projectId={projectId}
        open={!!selectedAccount}
        onOpenChange={(open) => !open && handleCloseDialog()}
      />
    </SidebarProvider>
  );
}