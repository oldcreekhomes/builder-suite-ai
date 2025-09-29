import React from 'react';

interface ActualTableFooterProps {
  budgetItems: any[];
}

export function ActualTableFooter({ budgetItems }: ActualTableFooterProps) {
  if (budgetItems.length === 0) return null;

  const totalBudget = budgetItems.reduce(
    (sum, item) => sum + ((item.quantity || 0) * (item.unit_price || 0)), 
    0
  );

  const totalActual = budgetItems.reduce(
    (sum, item) => sum + ((item as any).actual_amount || 0),
    0
  );

  const totalVariance = totalActual - totalBudget;

  const formatCurrency = (amount: number) => {
    return `$${Math.round(amount).toLocaleString()}`;
  };

  const getVarianceColor = (variance: number) => {
    if (variance > 0) return 'text-red-600'; // Over budget
    if (variance < 0) return 'text-green-600'; // Under budget
    return 'text-gray-600'; // On budget
  };

  return (
    <div className="flex justify-end space-x-8 text-lg font-semibold">
      <div>Total Budget: {formatCurrency(totalBudget)}</div>
      <div>Total Actual: {formatCurrency(totalActual)}</div>
      <div className={getVarianceColor(totalVariance)}>
        Total Variance: {formatCurrency(totalVariance)}
      </div>
    </div>
  );
}