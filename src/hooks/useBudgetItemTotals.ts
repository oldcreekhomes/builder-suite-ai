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

  // Calculate totals once for all items
  const itemTotalsMap = useMemo(() => {
    const totals: Record<string, number> = {};
    
    budgetItems.forEach(item => {
      const subcategoryTotal = subcategoryTotals[item.id];
      const costCode = item.cost_codes as any;
      
      // Get historical cost using composite key
      let historicalCostForItem: number | undefined = undefined;
      if (item.budget_source === 'historical' && item.historical_project_id && costCode?.code) {
        const lotId = item.historical_lot_id;
        const key = lotId ? `${item.historical_project_id}::${lotId}` : item.historical_project_id;
        const projectHistoricalCosts = historicalCostsMap[key];
        historicalCostForItem = projectHistoricalCosts?.[costCode.code] || 0;
      }
      
      totals[item.id] = calculateBudgetItemTotal(item, subcategoryTotal, false, historicalCostForItem);
    });
    
    return totals;
  }, [budgetItems, subcategoryTotals, historicalCostsMap]);

  return itemTotalsMap;
}
