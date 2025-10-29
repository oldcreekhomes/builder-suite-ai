import { useMemo } from 'react';
import { calculateBudgetItemTotal } from '@/utils/budgetUtils';
import { useMultipleHistoricalCosts } from './useMultipleHistoricalCosts';

/**
 * Centralized hook to calculate totals for all budget items once.
 * Returns a map of itemId => calculated total that can be reused everywhere.
 */
export function useBudgetItemTotals(
  budgetItems: any[],
  subcategoryTotals: Record<string, number> = {}
) {
  // Collect all unique historical project IDs from budget items
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

  // Calculate totals once for all items
  const itemTotalsMap = useMemo(() => {
    const totals: Record<string, number> = {};
    
    budgetItems.forEach(item => {
      const subcategoryTotal = subcategoryTotals[item.id];
      const costCode = item.cost_codes as any;
      
      // Get historical cost if this item uses historical source
      let historicalCostForItem: number | undefined = undefined;
      if (item.budget_source === 'historical' && item.historical_project_id && costCode?.code) {
        const projectHistoricalCosts = historicalCostsMap[item.historical_project_id];
        historicalCostForItem = projectHistoricalCosts?.[costCode.code] || 0;
      }
      
      totals[item.id] = calculateBudgetItemTotal(item, subcategoryTotal, false, historicalCostForItem);
    });
    
    return totals;
  }, [budgetItems, subcategoryTotals, historicalCostsMap]);

  return itemTotalsMap;
}
