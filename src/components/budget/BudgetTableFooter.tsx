import React, { useMemo } from 'react';
import { calculateBudgetItemTotal } from '@/utils/budgetUtils';
import { useMultipleHistoricalCosts } from '@/hooks/useMultipleHistoricalCosts';

interface BudgetTableFooterProps {
  budgetItems: any[];
  subcategoryTotals?: Record<string, number>;
}

export function BudgetTableFooter({ budgetItems, subcategoryTotals }: BudgetTableFooterProps) {
  // Build composite keys from historical_project_id + historical_lot_id
  const historicalCompositeKeys = useMemo(() => {
    const keys = new Set<string>();
    budgetItems.forEach(item => {
      if (item.budget_source === 'historical' && item.historical_project_id) {
        const lotId = item.historical_lot_id;
        const key = lotId ? `${item.historical_project_id}::${lotId}` : item.historical_project_id;
        keys.add(key);
      }
    });
    return Array.from(keys);
  }, [budgetItems]);

  // Fetch historical costs using composite keys (lot-aware)
  const { data: historicalCostsMap = {} } = useMultipleHistoricalCosts(historicalCompositeKeys);


  const totalBudget = useMemo(() => {
    if (budgetItems.length === 0) return 0;
    return budgetItems.reduce((sum, item) => {
      const costCode = item.cost_codes;
      const subcategoryTotal = costCode?.code ? subcategoryTotals?.[costCode.code] : undefined;
      
      // Get historical cost using composite key
      let historicalActualCost: number | undefined = undefined;
      if (item.budget_source === 'historical' && item.historical_project_id && costCode?.code) {
        const lotId = item.historical_lot_id;
        const key = lotId ? `${item.historical_project_id}::${lotId}` : item.historical_project_id;
        const projectMap = historicalCostsMap[key];
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
    return amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  };

  if (budgetItems.length === 0) return null;

  return (
    <div className="flex justify-end">
      <div className="text-lg font-semibold">
        Total Budget: {formatCurrency(totalBudget)}
      </div>
    </div>
  );
}
