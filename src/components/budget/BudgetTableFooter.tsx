import React, { useMemo } from 'react';
import { calculateBudgetItemTotal } from '@/utils/budgetUtils';
import { useMultipleHistoricalCosts } from '@/hooks/useMultipleHistoricalCosts';

interface BudgetTableFooterProps {
  budgetItems: any[];
  subcategoryTotals?: Record<string, number>;
}

export function BudgetTableFooter({ budgetItems, subcategoryTotals }: BudgetTableFooterProps) {
  if (budgetItems.length === 0) return null;

  // Collect all unique historical project IDs
  const historicalProjectIds = useMemo(() => {
    const ids = new Set<string>();
    budgetItems.forEach(item => {
      if (item.budget_source === 'historical' && item.historical_project_id) {
        ids.add(item.historical_project_id);
      }
    });
    return Array.from(ids);
  }, [budgetItems]);

  // Fetch historical costs for all historical projects
  const { data: historicalCostsMap = {} } = useMultipleHistoricalCosts(historicalProjectIds);

  const totalBudget = useMemo(() => {
    return budgetItems.reduce((sum, item) => {
      const costCode = item.cost_codes;
      const subcategoryTotal = costCode?.code ? subcategoryTotals?.[costCode.code] : undefined;
      
      // Get historical cost for this item if it uses historical source
      let historicalActualCost: number | undefined = undefined;
      if (item.budget_source === 'historical' && item.historical_project_id && costCode?.code) {
        const projectMap = historicalCostsMap[item.historical_project_id];
        if (projectMap) {
          historicalActualCost = projectMap[costCode.code];
        }
      }
      
      const itemTotal = calculateBudgetItemTotal(
        item,
        subcategoryTotal,
        false,
        historicalActualCost
      );
      
      return sum + itemTotal;
    }, 0);
  }, [budgetItems, subcategoryTotals, historicalCostsMap]);

  const formatCurrency = (amount: number) => {
    return `$${Math.round(amount).toLocaleString()}`;
  };

  return (
    <div className="flex justify-end">
      <div className="text-lg font-semibold">
        Total Budget: {formatCurrency(totalBudget)}
      </div>
    </div>
  );
}
