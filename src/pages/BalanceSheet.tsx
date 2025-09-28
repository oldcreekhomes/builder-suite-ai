import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import { CompanyDashboardHeader } from "@/components/CompanyDashboardHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

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
  const { data: balanceSheetData, isLoading, error } = useQuery({
    queryKey: ['balance-sheet'],
    queryFn: async (): Promise<BalanceSheetData> => {
      // Get all accounts
      const { data: accounts, error: accountsError } = await supabase
        .from('accounts')
        .select('*')
        .eq('is_active', true);

      if (accountsError) throw accountsError;

      // Get journal entry line balances
      const { data: journalLines, error: journalError } = await supabase
        .from('journal_entry_lines')
        .select('account_id, debit, credit');

      if (journalError) throw journalError;

      // Calculate account balances
      const accountBalances: Record<string, number> = {};
      
      journalLines?.forEach((line) => {
        if (!accountBalances[line.account_id]) {
          accountBalances[line.account_id] = 0;
        }
        accountBalances[line.account_id] += (line.debit || 0) - (line.credit || 0);
      });

      // Categorize accounts
      const assets: { current: AccountBalance[], fixed: AccountBalance[] } = { current: [], fixed: [] };
      const liabilities: { current: AccountBalance[], longTerm: AccountBalance[] } = { current: [], longTerm: [] };
      const equity: AccountBalance[] = [];

      accounts?.forEach((account) => {
        const balance = accountBalances[account.id] || 0;
        const accountBalance: AccountBalance = {
          id: account.id,
          code: account.code,
          name: account.name,
          type: account.type,
          balance: balance
        };

        switch (account.type) {
          case 'asset':
            // For now, categorize all assets as current
            // In a real implementation, you'd have subcategories
            assets.current.push(accountBalance);
            break;
          case 'liability':
            // For now, categorize all liabilities as current
            liabilities.current.push(accountBalance);
            break;
          case 'equity':
            equity.push(accountBalance);
            break;
        }
      });

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
    }
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  if (error) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <AppSidebar />
          <SidebarInset className="flex-1">
            <CompanyDashboardHeader />
            <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
              <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Balance Sheet</h2>
              </div>
              <Card>
                <CardContent className="p-6">
                  <p className="text-destructive">Error loading balance sheet data.</p>
                </CardContent>
              </Card>
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <SidebarInset className="flex-1">
          <CompanyDashboardHeader />
          <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
              <h2 className="text-3xl font-bold tracking-tight">Balance Sheet</h2>
              <div className="text-sm text-muted-foreground">
                As of {new Date().toLocaleDateString()}
              </div>
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
                              <div key={account.id} className="flex justify-between items-center text-sm">
                                <span>{account.code} - {account.name}</span>
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
                              <div key={account.id} className="flex justify-between items-center text-sm">
                                <span>{account.code} - {account.name}</span>
                                <span>{formatCurrency(account.balance)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="border-t pt-3 mt-4">
                        <div className="flex justify-between items-center font-semibold">
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
                              <div key={account.id} className="flex justify-between items-center text-sm">
                                <span>{account.code} - {account.name}</span>
                                <span>{formatCurrency(Math.abs(account.balance))}</span>
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
                              <div key={account.id} className="flex justify-between items-center text-sm">
                                <span>{account.code} - {account.name}</span>
                                <span>{formatCurrency(Math.abs(account.balance))}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="border-t pt-3 mb-6">
                        <div className="flex justify-between items-center font-semibold text-sm">
                          <span>Total Liabilities</span>
                          <span>{formatCurrency(Math.abs(balanceSheetData?.totalLiabilities || 0))}</span>
                        </div>
                      </div>

                      {/* Equity */}
                      {balanceSheetData?.equity && balanceSheetData.equity.length > 0 && (
                        <div className="mb-6">
                          <h4 className="font-semibold mb-3 text-sm">Equity</h4>
                          <div className="space-y-2">
                            {balanceSheetData.equity.map((account) => (
                              <div key={account.id} className="flex justify-between items-center text-sm">
                                <span>{account.code} - {account.name}</span>
                                <span>{formatCurrency(Math.abs(account.balance))}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="border-t pt-3">
                        <div className="flex justify-between items-center font-semibold">
                          <span>Total Liabilities & Equity</span>
                          <span>{formatCurrency(Math.abs(balanceSheetData?.totalLiabilities || 0) + Math.abs(balanceSheetData?.totalEquity || 0))}</span>
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
    </SidebarProvider>
  );
}