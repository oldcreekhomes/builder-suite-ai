
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

  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'estimate': return 'Estimate';
      case 'manual': return 'Manual';
      case 'vendor_bid': return 'Vendor Bid';
      case 'historical': return 'Historical';
      default: return 'Settings';
    }
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

  return (
    <div className="print-content hidden">
      <div className="print-header mb-6">
        <h1 className="text-2xl font-bold text-center mb-2">Project Budget</h1>
        {projectAddress && (
          <p className="text-center text-gray-600 mb-4">{projectAddress}</p>
        )}
      </div>

      {Object.entries(groupedBudgetItems).map(([group, items]) => {
        const groupTotal = calculateGroupTotal(items);
        const groupHistorical = calculateGroupHistorical(items);
        
        return (
          <div key={group} className="mb-6">
            <table className="w-full border-collapse border border-gray-300 mb-2" style={{ tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: '80px' }} />
                <col style={{ width: '250px' }} />
                <col style={{ width: '100px' }} />
                <col style={{ width: '120px' }} />
                {showHistorical && <col style={{ width: '120px' }} />}
                {showVariance && <col style={{ width: '100px' }} />}
              </colgroup>
              <thead>
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
                      <td className="border border-gray-300 p-1 text-sm">{getSourceLabel(item.budget_source)}</td>
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
                <tr className="bg-gray-50 font-semibold">
                  <td colSpan={3} className="border border-gray-300 p-1 text-right text-sm">Group Total:</td>
                  <td className="border border-gray-300 p-1 text-right text-sm">{formatCurrency(groupTotal)}</td>
                  {showHistorical && <td className="border border-gray-300 p-1 text-right text-sm">{formatCurrency(groupHistorical)}</td>}
                  {showVariance && (
                    <td className="border border-gray-300 p-1 text-right text-sm" style={getVarianceColor(groupTotal, groupHistorical)}>
                      {calculateVariance(groupTotal, groupHistorical)}
                    </td>
                  )}
                </tr>
              </tbody>
            </table>
          </div>
        );
      })}

      <div className="print-footer mt-6 pt-4 border-t-2 border-gray-300">
        <p className="text-center text-sm text-gray-500 mb-4">
          Generated on {new Date().toLocaleDateString()}
        </p>
        <table className="w-full border-collapse border border-gray-300" style={{ tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '80px' }} />
            <col style={{ width: '250px' }} />
            <col style={{ width: '100px' }} />
            <col style={{ width: '120px' }} />
            {showHistorical && <col style={{ width: '120px' }} />}
            {showVariance && <col style={{ width: '100px' }} />}
          </colgroup>
          <tbody>
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
          </tbody>
        </table>
      </div>
    </div>
  );
}
