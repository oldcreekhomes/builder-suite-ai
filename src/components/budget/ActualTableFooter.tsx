import React from 'react';

interface ActualTableFooterProps {
  budgetItems: any[];
  purchaseOrders: any[];
}

export function ActualTableFooter({ budgetItems, purchaseOrders }: ActualTableFooterProps) {
  if (budgetItems.length === 0) return null;

  const totalBudget = budgetItems.reduce(
    (sum, item) => sum + ((item.quantity || 0) * (item.unit_price || 0)), 
    0
  );

  const totalActual = budgetItems.reduce(
    (sum, item) => sum + (item.actual_amount || 0),
    0
  );

  // Calculate total committed costs from purchase orders
  const totalCommitted = purchaseOrders.reduce(
    (sum, po) => sum + (po.total_amount || 0),
    0
  );

  const totalVariance = totalBudget - totalActual - totalCommitted; // Budget - Actual Cost - Committed Costs

  const formatCurrency = (amount: number) => {
    return `$${Math.round(amount).toLocaleString()}`;
  };

  const getVarianceColor = (variance: number) => {
    if (variance < 0) return 'text-red-600'; // Over budget (negative)
    if (variance > 0) return 'text-green-600'; // Under budget (positive)
    return 'text-gray-600'; // On budget
  };

  return (
    <div className="flex justify-end space-x-8 text-lg font-semibold">
      <div>Total Budget: {formatCurrency(totalBudget)}</div>
      <div>Total Actual Cost: {formatCurrency(totalActual)}</div>
      <div>Total Committed Costs: {formatCurrency(totalCommitted)}</div>
      <div className={getVarianceColor(totalVariance)}>
        Total Variance: {formatCurrency(totalVariance)}
      </div>
    </div>
  );
}