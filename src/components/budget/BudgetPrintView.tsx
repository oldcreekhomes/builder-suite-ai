
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

  const totalBudget = Object.entries(groupedBudgetItems).reduce((sum, [group, items]) => {
    return sum + calculateGroupTotal(items);
  }, 0);

  const totalHistorical = budgetItems.reduce((sum, item) => {
    const costCode = item.cost_codes?.code;
    return sum + (costCode ? (historicalActualCosts[costCode] || 0) : 0);
  }, 0);

  const currentDate = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit' 
  });

  const currentTime = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className="print-content hidden">
      <div className="print-page-counter" aria-hidden="true"></div>
      <table className="w-full border-collapse" style={{ tableLayout: 'fixed', border: 'none', fontFamily: "'Montserrat', sans-serif" }}>
        <colgroup>
          <col style={{ width: '80px' }} />
          <col style={{ width: '250px' }} />
          <col style={{ width: '100px' }} />
          <col style={{ width: '120px' }} />
          {showHistorical && <col style={{ width: '120px' }} />}
          {showVariance && <col style={{ width: '100px' }} />}
          <col style={{ width: '120px' }} />
        </colgroup>
        
        <thead>
          {/* Print Header - Repeats on all pages */}
          <tr style={{ border: 'none' }}>
            <td colSpan={4 + (showHistorical ? 1 : 0) + (showVariance ? 1 : 0)} style={{ border: 'none', paddingTop: '0', paddingBottom: '4px' }}>
              <h1 className="text-2xl font-bold text-center" style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, margin: '0 0 4px 0' }}>
                PROJECT BUDGET
              </h1>
              <div className="text-sm font-normal text-center" style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 400, margin: '0 0 4px 0' }}>
                {projectAddress}
              </div>
              <div className="text-sm font-normal" style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 400, display: 'flex', justifyContent: 'space-between', margin: '0 0 4px 0' }}>
                <span>{currentDate}</span>
                <span>{currentTime}</span>
                <span></span>
              </div>
            </td>
          </tr>
          
          {/* Column Headers Row */}
          <tr style={{ backgroundColor: '#fff' }}>
            <th className="p-1 text-left text-sm font-semibold" style={{ borderTop: '1px solid #000', borderBottom: '1px solid #000', borderLeft: '1px solid #000', borderRight: '1px solid #000', fontFamily: "'Montserrat', sans-serif", fontWeight: 600 }}>Cost Code</th>
            <th className="p-1 text-left text-sm font-semibold" style={{ borderTop: '1px solid #000', borderBottom: '1px solid #000', borderRight: '1px solid #000', fontFamily: "'Montserrat', sans-serif", fontWeight: 600 }}>Name</th>
            <th className="p-1 text-left text-sm font-semibold" style={{ borderTop: '1px solid #000', borderBottom: '1px solid #000', borderRight: '1px solid #000', fontFamily: "'Montserrat', sans-serif", fontWeight: 600 }}>Source</th>
            {showHistorical && <th className="p-1 text-right text-sm font-semibold" style={{ borderTop: '1px solid #000', borderBottom: '1px solid #000', borderRight: '1px solid #000', fontFamily: "'Montserrat', sans-serif", fontWeight: 600 }}>Historical</th>}
            {showVariance && <th className="p-1 text-right text-sm font-semibold" style={{ borderTop: '1px solid #000', borderBottom: '1px solid #000', borderRight: '1px solid #000', fontFamily: "'Montserrat', sans-serif", fontWeight: 600 }}>Variance</th>}
            <th className="p-1 text-right text-sm font-semibold" style={{ borderTop: '1px solid #000', borderBottom: '1px solid #000', borderRight: '1px solid #000', fontFamily: "'Montserrat', sans-serif", fontWeight: 600 }}>Total Budget</th>
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
                    <tr key={item.id} style={{ backgroundColor: '#fff' }}>
                      <td className="p-1 text-sm" style={{ border: '1px solid #000', fontFamily: "'Montserrat', sans-serif", fontWeight: 400 }}>{costCode}</td>
                      <td className="p-1 text-sm" style={{ border: '1px solid #000', fontFamily: "'Montserrat', sans-serif", fontWeight: 400 }}>{item.cost_codes?.name}</td>
                      <td className="p-1 text-sm" style={{ border: '1px solid #000', fontFamily: "'Montserrat', sans-serif", fontWeight: 400 }}>{getSourceLabel(item)}</td>
                      {showHistorical && <td className="p-1 text-right text-sm" style={{ border: '1px solid #000', fontFamily: "'Montserrat', sans-serif", fontWeight: 400 }}>{formatCurrency(historicalValue)}</td>}
                      {showVariance && (
                        <td className="p-1 text-right text-sm" style={{ ...getVarianceColor(itemTotal, historicalValue), border: '1px solid #000', fontFamily: "'Montserrat', sans-serif", fontWeight: 400 }}>
                          {calculateVariance(itemTotal, historicalValue)}
                        </td>
                      )}
                      <td className="p-1 text-right text-sm" style={{ border: '1px solid #000', fontFamily: "'Montserrat', sans-serif", fontWeight: 400 }}>{formatCurrency(itemTotal)}</td>
                    </tr>
                  );
                })}
                
                {/* Group Total Row */}
                <tr style={{ backgroundColor: '#fff' }}>
                  <td colSpan={3} className="p-1 font-semibold" style={{ borderTop: '1px solid #000', borderBottom: '1px solid #000', borderRight: '1px solid #000', fontFamily: "'Montserrat', sans-serif", fontWeight: 600 }}>Subtotal for {group.split(' - ')[0]}</td>
                  {showHistorical && <td className="p-1 text-right text-sm font-semibold" style={{ border: '1px solid #000', fontFamily: "'Montserrat', sans-serif", fontWeight: 600 }}>{formatCurrency(groupHistorical)}</td>}
                  {showVariance && (
                    <td className="p-1 text-right text-sm font-semibold" style={{ ...getVarianceColor(groupTotal, groupHistorical), border: '1px solid #000', fontFamily: "'Montserrat', sans-serif", fontWeight: 600 }}>
                      {calculateVariance(groupTotal, groupHistorical)}
                    </td>
                  )}
                  <td className="p-1 text-right text-sm font-semibold" style={{ border: '1px solid #000', fontFamily: "'Montserrat', sans-serif", fontWeight: 600 }}>{formatCurrency(groupTotal)}</td>
                </tr>
              </React.Fragment>
            );
          })}
        </tbody>
        
        <tfoot>
          <tr style={{ backgroundColor: '#fff', borderTop: '2px solid #000' }}>
            <td colSpan={3} className="p-2 text-right text-lg font-bold" style={{ border: '1px solid #000', fontFamily: "'Montserrat', sans-serif", fontWeight: 700 }}>Project Total:</td>
            {showHistorical && <td className="p-2 text-right text-lg font-bold" style={{ border: '1px solid #000', fontFamily: "'Montserrat', sans-serif", fontWeight: 700 }}>{formatCurrency(totalHistorical)}</td>}
            {showVariance && (
              <td className="p-2 text-right text-lg font-bold" style={{ ...getVarianceColor(totalBudget, totalHistorical), border: '1px solid #000', fontFamily: "'Montserrat', sans-serif", fontWeight: 700 }}>
                {calculateVariance(totalBudget, totalHistorical)}
              </td>
            )}
            <td className="p-2 text-right text-lg font-bold" style={{ border: '1px solid #000', fontFamily: "'Montserrat', sans-serif", fontWeight: 700 }}>{formatCurrency(totalBudget)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
