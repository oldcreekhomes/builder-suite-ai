import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { JobCostBudgetDialog } from "./JobCostBudgetDialog";
import { JobCostActualDialog } from "./JobCostActualDialog";
import { JobCostGroupHeader } from "./JobCostGroupHeader";
import { JobCostGroupTotalRow } from "./JobCostGroupTotalRow";
import { JobCostRow } from "./JobCostRow";
import { JobCostProjectTotalRow } from "./JobCostProjectTotalRow";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { calculateBudgetItemTotal } from "@/utils/budgetUtils";

const getTopLevelGroup = (costCode: string): string => {
  const num = parseFloat(costCode);
  if (isNaN(num) || num < 1000) return 'Uncategorized';
  
  // Get the thousands digit (1000, 2000, 3000, 4000, etc.)
  const topLevel = Math.floor(num / 1000) * 1000;
  return topLevel.toString();
};

const getParentCode = (code: string): string => code.split('.')[0];

interface JobCostRow {
  costCodeId: string;
  costCode: string;
  costCodeName: string;
  parentGroup: string;
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
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  
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
          cost_codes(id, code, name, has_subcategories, price, parent_group)
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
      const costCodeData: Record<string, { code: string, name: string, parentGroup: string }> = {};
      
      // Add cost codes from budget
      budgetData?.forEach(item => {
        const cc = item.cost_codes;
        if (cc && item.cost_code_id) {
          costCodeSet.add(item.cost_code_id);
          costCodeData[item.cost_code_id] = { 
            code: cc.code, 
            name: cc.name,
            parentGroup: getTopLevelGroup(cc.code)
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
          .select('id, code, name, parent_group')
          .in('id', missingCostCodeIds);

        missingCostCodes?.forEach(cc => {
          costCodeData[cc.id] = {
            code: cc.code,
            name: cc.name,
            parentGroup: getTopLevelGroup(cc.code)
          };
        });
      }

// Step 6: Calculate budgets aggregated to parent codes (match Budget UI)
const sumChildrenByParent: Record<string, number> = {};
const parentItemTotals: Record<string, number> = {};
const parentsWithChildren = new Set<string>();
const parentNamesByCode: Record<string, string> = {};

budgetData?.forEach(item => {
  if (!item.cost_code_id || !item.cost_codes) return;
  const code = (item.cost_codes as any).code as string;
  const name = (item.cost_codes as any).name as string;
  const parentCode = getParentCode(code);
  const isChild = code.includes('.');
  const total = calculateBudgetItemTotal(item, 0, false);

  if (isChild) {
    sumChildrenByParent[parentCode] = (sumChildrenByParent[parentCode] || 0) + total;
    parentsWithChildren.add(parentCode);
  } else {
    parentItemTotals[parentCode] = (parentItemTotals[parentCode] || 0) + total;
    parentNamesByCode[parentCode] = name;
  }
});

// If we only saw children, fetch parent names
const missingParentCodes = Array.from(parentsWithChildren).filter(pc => !parentNamesByCode[pc]);
if (missingParentCodes.length > 0) {
  const { data: parentCodeNames } = await supabase
    .from('cost_codes')
    .select('code, name')
    .in('code', missingParentCodes);
  parentCodeNames?.forEach(cc => {
    parentNamesByCode[cc.code] = cc.name;
  });
}

// Build budgets by parent code; children override parent if present
const budgetsByParentCode: Record<string, number> = {};
const allParentCodesSet = new Set<string>([
  ...Object.keys(parentItemTotals),
  ...Object.keys(sumChildrenByParent),
]);

allParentCodesSet.forEach(pc => {
  budgetsByParentCode[pc] = parentsWithChildren.has(pc)
    ? (sumChildrenByParent[pc] || 0)
    : (parentItemTotals[pc] || 0);
});

// Step 7: Aggregate actuals to parent codes
const actualsByParentCode: Record<string, number> = {};
Object.entries(actualsByCostCode).forEach(([id, amount]) => {
  const cd = costCodeData[id];
  if (!cd) return;
  const parentCode = getParentCode(cd.code);
  actualsByParentCode[parentCode] = (actualsByParentCode[parentCode] || 0) + (amount as number);
});

// Ensure we have a display name for all parent codes we will render
Object.keys(actualsByParentCode).forEach(pc => {
  if (!parentNamesByCode[pc]) parentNamesByCode[pc] = pc;
});

// Step 8: Build parent-only rows (no subcategories)
const parentRows: JobCostRow[] = [];
Array.from(new Set<string>([
  ...Object.keys(budgetsByParentCode),
  ...Object.keys(actualsByParentCode),
])).forEach(parentCode => {
  const budget = budgetsByParentCode[parentCode] || 0;
  const actual = actualsByParentCode[parentCode] || 0;
  const variance = budget - actual;
  parentRows.push({
    costCodeId: parentCode,
    costCode: parentCode,
    costCodeName: parentNamesByCode[parentCode] || '',
    parentGroup: getTopLevelGroup(parentCode),
    budget,
    actual,
    variance,
  });
});

// Sort by cost code numerically
parentRows.sort((a, b) => {
  const numA = parseFloat(a.costCode) || 0;
  const numB = parseFloat(b.costCode) || 0;
  return numA - numB;
});

console.log(`🔍 Job Costs: Returning ${parentRows.length} parent cost code rows`);
return parentRows;
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

  // Group data by parent_group
  const groupedJobCosts = useMemo(() => {
    if (!jobCostsData) return {};
    
    const grouped: Record<string, JobCostRow[]> = {};
    jobCostsData.forEach(row => {
      const group = row.parentGroup || 'Uncategorized';
      if (!grouped[group]) {
        grouped[group] = [];
      }
      grouped[group].push(row);
    });
    
    // Sort groups alphabetically
    const sortedGroups: Record<string, JobCostRow[]> = {};
    Object.keys(grouped).sort().forEach(key => {
      sortedGroups[key] = grouped[key];
    });
    
    return sortedGroups;
  }, [jobCostsData]);

  // Calculate group totals
  const calculateGroupTotals = (rows: JobCostRow[]) => {
    return rows.reduce((acc, row) => ({
      budget: acc.budget + row.budget,
      actual: acc.actual + row.actual,
      variance: acc.variance + row.variance
    }), { budget: 0, actual: 0, variance: 0 });
  };

  // Initialize all groups as expanded
  useEffect(() => {
    if (groupedJobCosts && Object.keys(groupedJobCosts).length > 0) {
      setExpandedGroups(new Set(Object.keys(groupedJobCosts)));
    }
  }, [groupedJobCosts]);

  const handleGroupToggle = (group: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(group)) {
        newSet.delete(group);
      } else {
        newSet.add(group);
      }
      return newSet;
    });
  };

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
            <div className="border rounded-lg">
              <Table className="table-fixed">
                <colgroup>
                  <col style={{ width: '200px' }} />
                  <col />
                  <col style={{ width: '180px' }} />
                  <col style={{ width: '180px' }} />
                  <col style={{ width: '180px' }} />
                </colgroup>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-left">Cost Code</TableHead>
                    <TableHead className="text-left">Name</TableHead>
                    <TableHead className="text-right">Budget</TableHead>
                    <TableHead className="text-right">Actual</TableHead>
                    <TableHead className="text-right">Variance</TableHead>
                  </TableRow>
                </TableHeader>
                {!jobCostsData || jobCostsData.length === 0 ? (
                  <tbody>
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-sm text-muted-foreground">
                        No job cost data available for this project.
                      </td>
                    </tr>
                  </tbody>
                ) : (
                  <>
                    {Object.entries(groupedJobCosts).map(([group, rows], index) => {
                      const groupTotals = calculateGroupTotals(rows);
                      return (
                        <tbody key={group}>
                          <JobCostGroupHeader
                            group={group}
                            isExpanded={expandedGroups.has(group)}
                            onToggle={() => handleGroupToggle(group)}
                            groupTotal={groupTotals}
                          />
                          {expandedGroups.has(group) && (
                            <>
                              {rows.map(row => (
                                <JobCostRow
                                  key={row.costCodeId}
                                  row={row}
                                  onBudgetClick={() => {
                                    setSelectedCostCode(row);
                                    setDialogType('budget');
                                  }}
                                  onActualClick={() => {
                                    setSelectedCostCode(row);
                                    setDialogType('actual');
                                  }}
                                />
                              ))}
                              <JobCostGroupTotalRow
                                group={group}
                                totals={groupTotals}
                              />
                            </>
                          )}
                        </tbody>
                      );
                    })}
                    <tbody>
                      <JobCostProjectTotalRow
                        totalBudget={totalBudget}
                        totalActual={totalActual}
                        totalVariance={totalVariance}
                      />
                    </tbody>
                  </>
                )}
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
