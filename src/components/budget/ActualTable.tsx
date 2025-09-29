import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { useBudgetData } from '@/hooks/useBudgetData';
import { useBudgetMutations } from '@/hooks/useBudgetMutations';
import type { Tables } from '@/integrations/supabase/types';

type CostCode = Tables<'cost_codes'>;

interface ActualTableProps {
  projectId: string;
  projectAddress?: string;
}

export function ActualTable({ projectId, projectAddress }: ActualTableProps) {
  const [editingActual, setEditingActual] = useState<string | null>(null);
  const [actualValue, setActualValue] = useState<string>('');
  
  const { budgetItems, groupedBudgetItems } = useBudgetData(projectId);
  const { handleUpdateActual } = useBudgetMutations(projectId);

  const formatCurrency = (amount: number) => {
    return `$${Math.round(amount).toLocaleString()}`;
  };

  const calculateBudgetTotal = (quantity: number, unitPrice: number) => {
    return (quantity || 0) * (unitPrice || 0);
  };

  const calculateVariance = (budget: number, actual: number) => {
    return actual - budget;
  };

  const getVarianceColor = (variance: number) => {
    if (variance > 0) return 'text-red-600'; // Over budget
    if (variance < 0) return 'text-green-600'; // Under budget
    return 'text-gray-600'; // On budget
  };

  const handleActualClick = (itemId: string, currentActual: number) => {
    setEditingActual(itemId);
    setActualValue(currentActual.toString());
  };

  const handleActualBlur = (itemId: string) => {
    const numericValue = parseFloat(actualValue) || 0;
    handleUpdateActual(itemId, numericValue);
    setEditingActual(null);
  };

  const handleActualKeyDown = (e: React.KeyboardEvent, itemId: string) => {
    if (e.key === 'Enter') {
      handleActualBlur(itemId);
    } else if (e.key === 'Escape') {
      setEditingActual(null);
    }
  };

  const calculateGroupActualTotal = (groupItems: any[]) => {
    return groupItems.reduce((sum, item) => sum + ((item as any).actual_amount || 0), 0);
  };

  const calculateGroupBudgetTotal = (groupItems: any[]) => {
    return groupItems.reduce((sum, item) => sum + calculateBudgetTotal(item.quantity, item.unit_price), 0);
  };

  const calculateTotalActual = () => {
    return budgetItems.reduce((sum, item) => sum + ((item as any).actual_amount || 0), 0);
  };

  const calculateTotalBudget = () => {
    return budgetItems.reduce((sum, item) => sum + calculateBudgetTotal(item.quantity, item.unit_price), 0);
  };

  const totalBudget = calculateTotalBudget();
  const totalActual = calculateTotalActual();
  const totalVariance = calculateVariance(totalBudget, totalActual);

  return (
    <div className="space-y-4">
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="h-8">
              <TableHead className="h-8 px-3 py-0 text-xs font-medium">Cost Code</TableHead>
              <TableHead className="h-8 px-3 py-0 text-xs font-medium">Name</TableHead>
              <TableHead className="h-8 px-3 py-0 text-xs font-medium text-right">Budget</TableHead>
              <TableHead className="h-8 px-3 py-0 text-xs font-medium text-right">Actual</TableHead>
              <TableHead className="h-8 px-3 py-0 text-xs font-medium text-right">Variance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {budgetItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                  No budget items added yet.
                </TableCell>
              </TableRow>
            ) : (
              <>
                {Object.entries(groupedBudgetItems).map(([group, items]) => {
                  const groupBudgetTotal = calculateGroupBudgetTotal(items);
                  const groupActualTotal = calculateGroupActualTotal(items);
                  const groupVariance = calculateVariance(groupBudgetTotal, groupActualTotal);

                  return (
                    <React.Fragment key={group}>
                      {/* Group Header Row */}
                      <TableRow className="bg-gray-50 border-t-2 border-gray-200">
                        <TableCell className="px-3 py-2 font-semibold text-sm" colSpan={2}>
                          {group}
                        </TableCell>
                        <TableCell className="px-3 py-2 font-semibold text-sm text-right">
                          {formatCurrency(groupBudgetTotal)}
                        </TableCell>
                        <TableCell className="px-3 py-2 font-semibold text-sm text-right">
                          {formatCurrency(groupActualTotal)}
                        </TableCell>
                        <TableCell className={`px-3 py-2 font-semibold text-sm text-right ${getVarianceColor(groupVariance)}`}>
                          {formatCurrency(groupVariance)}
                        </TableCell>
                      </TableRow>
                      
                      {/* Individual Items */}
                      {items.map((item) => {
                        const costCode = item.cost_codes as CostCode;
                        const budgetTotal = calculateBudgetTotal(item.quantity, item.unit_price);
                        const actualAmount = (item as any).actual_amount || 0;
                        const variance = calculateVariance(budgetTotal, actualAmount);

                        return (
                          <TableRow key={item.id} className="h-8">
                            <TableCell className="px-3 py-1 text-xs">
                              {costCode?.code || '-'}
                            </TableCell>
                            <TableCell className="px-3 py-1 text-xs">
                              {costCode?.name || '-'}
                            </TableCell>
                            <TableCell className="px-3 py-1 text-xs text-right">
                              {formatCurrency(budgetTotal)}
                            </TableCell>
                            <TableCell 
                              className="px-3 py-1 text-xs text-right cursor-pointer hover:bg-gray-50"
                              onClick={() => handleActualClick(item.id, actualAmount)}
                            >
                              {editingActual === item.id ? (
                                <Input
                                  type="number"
                                  value={actualValue}
                                  onChange={(e) => setActualValue(e.target.value)}
                                  onBlur={() => handleActualBlur(item.id)}
                                  onKeyDown={(e) => handleActualKeyDown(e, item.id)}
                                  className="h-6 border-none shadow-none bg-transparent text-xs p-0 text-right focus:ring-0"
                                  autoFocus
                                />
                              ) : (
                                formatCurrency(actualAmount)
                              )}
                            </TableCell>
                            <TableCell className={`px-3 py-1 text-xs text-right ${getVarianceColor(variance)}`}>
                              {formatCurrency(variance)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Totals Footer */}
      {budgetItems.length > 0 && (
        <div className="flex justify-end space-x-8 text-lg font-semibold border-t pt-4">
          <div>Total Budget: {formatCurrency(totalBudget)}</div>
          <div>Total Actual: {formatCurrency(totalActual)}</div>
          <div className={`${getVarianceColor(totalVariance)}`}>
            Total Variance: {formatCurrency(totalVariance)}
          </div>
        </div>
      )}
    </div>
  );
}