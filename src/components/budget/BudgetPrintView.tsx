
import React from 'react';
import { calculateBudgetItemTotal } from '@/utils/budgetUtils';
import { VisibleColumns } from './BudgetColumnVisibilityDropdown';

interface BudgetPrintViewProps {
  budgetItems: any[];
  groupedBudgetItems: Record<string, any[]>;
  projectAddress?: string;
  subcategoryTotals?: Record<string, number>;
  historicalCostsMap?: Record<string, Record<string, number>>;
  visibleColumns: VisibleColumns;
  selectedHistoricalProject: string;
  showVarianceAsPercentage: boolean;
  historicalActualCosts: Record<string, number>;
}

export function BudgetPrintView({ 
  budgetItems, 
  groupedBudgetItems, 
  projectAddress, 
  subcategoryTotals = {}, 
  historicalCostsMap = {},
  visibleColumns,
  selectedHistoricalProject,
  showVarianceAsPercentage,
  historicalActualCosts
}: BudgetPrintViewProps) {
  const formatCurrency = (amount: number) => {
    return `$${Math.round(amount).toLocaleString()}`;
  };

  const getHistoricalCost = (item: any) => {
    if (item.budget_source === 'historical' && item.historical_project_id) {
      const costCode = item.cost_codes?.code;
      if (costCode && historicalCostsMap[item.historical_project_id]) {
        return historicalCostsMap[item.historical_project_id][costCode];
      }
    }
    return undefined;
  };

  const getSourceLabel = (item: any) => {
    // Check budget_source field first (new system)
    if (item.budget_source) {
      switch (item.budget_source) {
        case 'vendor-bid': return 'Vendor Bid';
        case 'estimate': return 'Estimate';
        case 'historical': return 'Historical';
        case 'settings': return 'Settings';
        case 'manual': return 'Manual';
      }
    }

    // Legacy logic for items without budget_source set
    if (item.selected_bid_id && item.selected_bid) {
      return 'Vendor Bid';
    }
    
    const costCode = item.cost_codes;
    if (costCode?.has_subcategories) {
      return 'Estimate';
    }
    
    if ((item.quantity !== null && item.quantity > 0) || (item.unit_price !== null && item.unit_price > 0)) {
      return 'Manual';
    }
    
    return 'Manual';
  };

  const calculateVariance = (budgetTotal: number, historicalValue: number) => {
    if (showVarianceAsPercentage && historicalValue > 0) {
      const percentage = ((budgetTotal - historicalValue) / historicalValue) * 100;
      return `${percentage >= 0 ? '+' : ''}${percentage.toFixed(1)}%`;
    }
    const variance = budgetTotal - historicalValue;
    return `${variance >= 0 ? '+' : ''}${formatCurrency(variance)}`;
  };

  const getVarianceColor = (budgetTotal: number, historicalValue: number): React.CSSProperties => {
    const variance = budgetTotal - historicalValue;
    if (variance > 0) return { color: '#ef4444' }; // red
    if (variance < 0) return { color: '#10b981' }; // green
    return { color: '#6b7280' }; // gray
  };

  const showHistorical = visibleColumns.historicalCosts && selectedHistoricalProject !== 'none';
  const showVariance = visibleColumns.variance && showHistorical;

  const totalBudget = budgetItems.reduce(
    (sum, item) => {
      const subcategoryTotal = subcategoryTotals[item.id];
      const historicalCost = getHistoricalCost(item);
      return sum + calculateBudgetItemTotal(item, subcategoryTotal, false, historicalCost);
    }, 
    0
  );

  const totalHistorical = budgetItems.reduce((sum, item) => {
    const costCode = item.cost_codes?.code;
    return sum + (costCode ? (historicalActualCosts[costCode] || 0) : 0);
  }, 0);

  const calculateGroupTotal = (items: any[]) => {
    return items.reduce((sum, item) => {
      const subcategoryTotal = subcategoryTotals[item.id];
      const historicalCost = getHistoricalCost(item);
      return sum + calculateBudgetItemTotal(item, subcategoryTotal, false, historicalCost);
    }, 0);
  };

  const calculateGroupHistorical = (items: any[]) => {
    return items.reduce((sum, item) => {
      const costCode = item.cost_codes?.code;
      return sum + (costCode ? (historicalActualCosts[costCode] || 0) : 0);
    }, 0);
  };

  const currentDate = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit' 
  });

  return (
    <div className="print-content hidden">
      <table className="w-full border-collapse border border-gray-300" style={{ tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: '80px' }} />
          <col style={{ width: '250px' }} />
          <col style={{ width: '100px' }} />
          <col style={{ width: '120px' }} />
          {showHistorical && <col style={{ width: '120px' }} />}
          {showVariance && <col style={{ width: '100px' }} />}
        </colgroup>
        
        <thead>
          {/* Date/Time, Address, Page Numbers Row */}
          <tr>
            <th colSpan={4 + (showHistorical ? 1 : 0) + (showVariance ? 1 : 0)} className="border border-gray-300 p-2">
              <div className="flex justify-between items-center text-sm text-gray-600">
                <span>{currentDate}</span>
                <span className="font-normal">{projectAddress}</span>
                <span><span className="page-number"></span>/<span className="total-pages"></span></span>
              </div>
            </th>
          </tr>
          
          {/* Column Headers Row */}
          <tr className="bg-gray-50">
            <th className="border border-gray-300 p-1 text-left text-sm">Cost Code</th>
            <th className="border border-gray-300 p-1 text-left text-sm">Name</th>
            <th className="border border-gray-300 p-1 text-left text-sm">Source</th>
            <th className="border border-gray-300 p-1 text-right text-sm">Total Budget</th>
            {showHistorical && <th className="border border-gray-300 p-1 text-right text-sm">Historical</th>}
            {showVariance && <th className="border border-gray-300 p-1 text-right text-sm">Variance</th>}
          </tr>
        </thead>
        
        <tbody>
          {Object.entries(groupedBudgetItems).map(([group, items]) => {
            const groupTotal = calculateGroupTotal(items);
            const groupHistorical = calculateGroupHistorical(items);
            
            return (
              <React.Fragment key={group}>
                {items.map((item) => {
                  const subcategoryTotal = subcategoryTotals[item.id];
                  const historicalCost = getHistoricalCost(item);
                  const itemTotal = calculateBudgetItemTotal(item, subcategoryTotal, false, historicalCost);
                  const costCode = item.cost_codes?.code;
                  const historicalValue = costCode ? (historicalActualCosts[costCode] || 0) : 0;
                  
                  return (
                    <tr key={item.id}>
                      <td className="border border-gray-300 p-1 text-sm">{costCode}</td>
                      <td className="border border-gray-300 p-1 text-sm">{item.cost_codes?.name}</td>
                      <td className="border border-gray-300 p-1 text-sm">{getSourceLabel(item)}</td>
                      <td className="border border-gray-300 p-1 text-right text-sm">{formatCurrency(itemTotal)}</td>
                      {showHistorical && <td className="border border-gray-300 p-1 text-right text-sm">{formatCurrency(historicalValue)}</td>}
                      {showVariance && (
                        <td className="border border-gray-300 p-1 text-right text-sm" style={getVarianceColor(itemTotal, historicalValue)}>
                          {calculateVariance(itemTotal, historicalValue)}
                        </td>
                      )}
                    </tr>
                  );
                })}
                
                {/* Group Total Row */}
                <tr className="bg-gray-50 font-semibold">
                  <td colSpan={3} className="border border-gray-300 p-1"></td>
                  <td className="border border-gray-300 p-1 text-right text-sm">{formatCurrency(groupTotal)}</td>
                  {showHistorical && <td className="border border-gray-300 p-1 text-right text-sm">{formatCurrency(groupHistorical)}</td>}
                  {showVariance && (
                    <td className="border border-gray-300 p-1 text-right text-sm" style={getVarianceColor(groupTotal, groupHistorical)}>
                      {calculateVariance(groupTotal, groupHistorical)}
                    </td>
                  )}
                </tr>
              </React.Fragment>
            );
          })}
        </tbody>
        
        <tfoot>
          <tr className="bg-gray-100 font-bold">
            <td colSpan={3} className="border border-gray-300 p-2 text-right text-lg">Project Total:</td>
            <td className="border border-gray-300 p-2 text-right text-lg">{formatCurrency(totalBudget)}</td>
            {showHistorical && <td className="border border-gray-300 p-2 text-right text-lg">{formatCurrency(totalHistorical)}</td>}
            {showVariance && (
              <td className="border border-gray-300 p-2 text-right text-lg" style={getVarianceColor(totalBudget, totalHistorical)}>
                {calculateVariance(totalBudget, totalHistorical)}
              </td>
            )}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
