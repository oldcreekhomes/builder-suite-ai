
import React from 'react';

interface BudgetTableFooterProps {
  budgetItems: any[];
}

export function BudgetTableFooter({ budgetItems }: BudgetTableFooterProps) {
  if (budgetItems.length === 0) return null;

  const totalBudget = budgetItems.reduce(
    (sum, item) => sum + ((item.quantity || 0) * (item.unit_price || 0)), 
    0
  );

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
