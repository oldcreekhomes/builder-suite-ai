import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { JobCostBudgetDialog } from "./JobCostBudgetDialog";
import { JobCostActualDialog } from "./JobCostActualDialog";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { calculateBudgetItemTotal } from "@/utils/budgetUtils";

interface JobCostRow {
  costCodeId: string;
  costCode: string;
  costCodeName: string;
  budget: number;
  actual: number;
  variance: number;
}

interface JobCostsContentProps {
  projectId?: string;
}

export function JobCostsContent({ projectId }: JobCostsContentProps) {
  const { user, session, loading: authLoading } = useAuth();
  const [asOfDate, setAsOfDate] = useState<Date>(new Date());
  const [selectedCostCode, setSelectedCostCode] = useState<JobCostRow | null>(null);
  const [dialogType, setDialogType] = useState<'budget' | 'actual' | null>(null);
  
  const { data: jobCostsData, isLoading, error } = useQuery({
    queryKey: ['job-costs', user?.id, projectId, asOfDate.toISOString().split('T')[0]],
    queryFn: async (): Promise<JobCostRow[]> => {
      if (!projectId) {
        throw new Error("Project ID is required for Job Costs report");
      }

      console.log("🔍 Job Costs: Starting query for project:", projectId);

      // Step 1: Get WIP account ID
      const { data: settings, error: settingsError } = await supabase
        .from('accounting_settings')
        .select('wip_account_id')
        .single();

      if (settingsError) {
        console.error("🔍 Job Costs: Settings query failed:", settingsError);
        throw settingsError;
      }

      const wipAccountId = settings?.wip_account_id;
      if (!wipAccountId) {
        throw new Error("WIP account not configured in accounting settings");
      }

      console.log("🔍 Job Costs: WIP account ID:", wipAccountId);

      // Step 2: Get budget data
      const { data: budgetData, error: budgetError } = await supabase
        .from('project_budgets')
        .select(`
          id,
          cost_code_id,
          quantity,
          unit_price,
          budget_source,
          selected_bid_id,
          historical_project_id,
          selected_bid:project_bids!selected_bid_id(price),
          cost_codes(id, code, name, has_subcategories, price)
        `)
        .eq('project_id', projectId);

      if (budgetError) {
        console.error("🔍 Job Costs: Budget query failed:", budgetError);
        throw budgetError;
      }

      console.log(`🔍 Job Costs: Found ${budgetData?.length || 0} budget items`);

      // Step 3: Get actual WIP costs
      const { data: wipLines, error: wipError } = await supabase
        .from('journal_entry_lines')
        .select(`
          cost_code_id,
          debit,
          credit,
          journal_entries!inner(entry_date)
        `)
        .eq('account_id', wipAccountId)
        .eq('project_id', projectId)
        .not('cost_code_id', 'is', null)
        .lte('journal_entries.entry_date', asOfDate.toISOString().split('T')[0]);

      if (wipError) {
        console.error("🔍 Job Costs: WIP lines query failed:", wipError);
        throw wipError;
      }

      console.log(`🔍 Job Costs: Found ${wipLines?.length || 0} WIP journal lines`);

      // Step 4: Build cost code map with actuals
      const actualsByCostCode: Record<string, number> = {};
      wipLines?.forEach(line => {
        const costCodeId = line.cost_code_id!;
        actualsByCostCode[costCodeId] = 
          (actualsByCostCode[costCodeId] || 0) + ((line.debit || 0) - (line.credit || 0));
      });

      // Step 5: Collect all unique cost codes and their details
      const costCodeSet = new Set<string>();
      const costCodeData: Record<string, { code: string, name: string }> = {};
      
      // Add cost codes from budget
      budgetData?.forEach(item => {
        const cc = item.cost_codes;
        if (cc && item.cost_code_id) {
          costCodeSet.add(item.cost_code_id);
          costCodeData[item.cost_code_id] = { 
            code: cc.code, 
            name: cc.name 
          };
        }
      });
      
      // Add cost codes from actuals (even if not in budget)
      wipLines?.forEach(line => {
        if (line.cost_code_id) {
          costCodeSet.add(line.cost_code_id);
        }
      });

      // Fetch missing cost code details for codes that only appear in WIP
      const missingCostCodeIds = Array.from(costCodeSet).filter(id => !costCodeData[id]);
      if (missingCostCodeIds.length > 0) {
        const { data: missingCostCodes } = await supabase
          .from('cost_codes')
          .select('id, code, name')
          .in('id', missingCostCodeIds);

        missingCostCodes?.forEach(cc => {
          costCodeData[cc.id] = {
            code: cc.code,
            name: cc.name
          };
        });
      }

      // Step 6: Calculate budgets using existing utility
      const budgetsByCostCode: Record<string, number> = {};
      budgetData?.forEach(item => {
        if (item.cost_code_id) {
          const total = calculateBudgetItemTotal(item, 0, false);
          budgetsByCostCode[item.cost_code_id] = 
            (budgetsByCostCode[item.cost_code_id] || 0) + total;
        }
      });

      // Step 7: Build result rows
      const rows: JobCostRow[] = [];
      costCodeSet.forEach(costCodeId => {
        const budget = budgetsByCostCode[costCodeId] || 0;
        const actual = actualsByCostCode[costCodeId] || 0;
        const variance = budget - actual;
        
        const cd = costCodeData[costCodeId];
        if (cd) {
          rows.push({
            costCodeId,
            costCode: cd.code,
            costCodeName: cd.name,
            budget,
            actual,
            variance
          });
        }
      });

      // Sort by cost code numerically
      rows.sort((a, b) => {
        const numA = parseFloat(a.costCode) || 0;
        const numB = parseFloat(b.costCode) || 0;
        return numA - numB;
      });

      console.log(`🔍 Job Costs: Returning ${rows.length} cost code rows`);
      return rows;
    },
    enabled: !!user && !!session && !authLoading && !!projectId,
    retry: (failureCount, error: any) => {
      if (error?.code === 'PGRST301' || error?.message?.includes('row-level security')) {
        console.error("🔍 Job Costs: RLS policy violation");
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

  if (!projectId) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Job Costs</h2>
        </div>
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">Please select a project to view job costs report.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Job Costs</h2>
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-4 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    console.error("🔍 Job Costs: Query error:", error);
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Job Costs</h2>
        </div>
        <Card>
          <CardContent className="p-6">
            <p className="text-destructive">Error loading job costs data.</p>
            {error?.message?.includes('WIP account not configured') ? (
              <p className="text-sm text-muted-foreground mt-2">
                Please configure your WIP account in accounting settings.
              </p>
            ) : error?.code === 'PGRST301' || error?.message?.includes('row-level security') ? (
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

  const totalBudget = jobCostsData?.reduce((sum, row) => sum + row.budget, 0) || 0;
  const totalActual = jobCostsData?.reduce((sum, row) => sum + row.actual, 0) || 0;
  const totalVariance = totalBudget - totalActual;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Job Costs</h2>
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
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-4 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Budget vs. Actual</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Table */}
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <colgroup>
                  <col style={{ width: '200px' }} />
                  <col style={{ width: '180px' }} />
                  <col style={{ width: '180px' }} />
                  <col style={{ width: '180px' }} />
                </colgroup>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-left">Cost Code</TableHead>
                    <TableHead className="text-right">Budget</TableHead>
                    <TableHead className="text-right">Actual</TableHead>
                    <TableHead className="text-right">Variance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!jobCostsData || jobCostsData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-sm text-muted-foreground">
                        No job cost data available for this project.
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {jobCostsData.map((row) => (
                        <TableRow 
                          key={row.costCodeId}
                          className="h-10 hover:bg-muted/50 transition-colors"
                        >
                          <TableCell className="py-1 text-sm">
                            <span className="font-medium">{row.costCode}</span>
                            <span className="text-muted-foreground ml-2">{row.costCodeName}</span>
                          </TableCell>
                          <TableCell 
                            className="text-right py-1 cursor-pointer hover:bg-muted/50 hover:underline"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCostCode(row);
                              setDialogType('budget');
                            }}
                          >
                            <span className="text-sm">{formatCurrency(row.budget)}</span>
                          </TableCell>
                          <TableCell 
                            className="text-right py-1 cursor-pointer hover:bg-muted/50 hover:underline"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCostCode(row);
                              setDialogType('actual');
                            }}
                          >
                            <span className="text-sm">{formatCurrency(row.actual)}</span>
                          </TableCell>
                          <TableCell className={`text-right py-1 text-sm font-medium ${
                            row.variance >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {formatCurrency(row.variance)}
                          </TableCell>
                        </TableRow>
                      ))}
                      
                      {/* Total Row */}
                      <TableRow className="font-semibold bg-muted/30">
                        <TableCell className="py-2">Total</TableCell>
                        <TableCell className="text-right py-2">{formatCurrency(totalBudget)}</TableCell>
                        <TableCell className="text-right py-2">{formatCurrency(totalActual)}</TableCell>
                        <TableCell className={`text-right py-2 ${
                          totalVariance >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {formatCurrency(totalVariance)}
                        </TableCell>
                      </TableRow>
                    </>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      {dialogType === 'budget' && selectedCostCode && projectId && (
        <JobCostBudgetDialog
          isOpen={true}
          onClose={() => {
            setDialogType(null);
            setSelectedCostCode(null);
          }}
          costCode={selectedCostCode.costCode}
          costCodeName={selectedCostCode.costCodeName}
          projectId={projectId}
          totalBudget={selectedCostCode.budget}
        />
      )}

      {dialogType === 'actual' && selectedCostCode && projectId && (
        <JobCostActualDialog
          isOpen={true}
          onClose={() => {
            setDialogType(null);
            setSelectedCostCode(null);
          }}
          costCode={selectedCostCode.costCode}
          costCodeName={selectedCostCode.costCodeName}
          projectId={projectId}
          totalActual={selectedCostCode.actual}
          asOfDate={asOfDate}
        />
      )}
    </div>
  );
}
