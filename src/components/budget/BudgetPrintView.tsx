
import React from 'react';
import { formatUnitOfMeasure, calculateBudgetItemTotal } from '@/utils/budgetUtils';

interface BudgetPrintViewProps {
  budgetItems: any[];
  groupedBudgetItems: Record<string, any[]>;
  projectAddress?: string;
  subcategoryTotals?: Record<string, number>;
}

export function BudgetPrintView({ budgetItems, groupedBudgetItems, projectAddress, subcategoryTotals = {} }: BudgetPrintViewProps) {
  const formatCurrency = (amount: number) => {
    return `$${Math.round(amount).toLocaleString()}`;
  };

  const totalBudget = budgetItems.reduce(
    (sum, item) => {
      const subcategoryTotal = subcategoryTotals[item.id];
      return sum + calculateBudgetItemTotal(item, subcategoryTotal, false);
    }, 
    0
  );

  const calculateGroupTotal = (items: any[]) => {
    return items.reduce((sum, item) => {
      const subcategoryTotal = subcategoryTotals[item.id];
      return sum + calculateBudgetItemTotal(item, subcategoryTotal, false);
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

      {Object.entries(groupedBudgetItems).map(([group, items]) => (
        <div key={group} className="mb-6 page-break">
          <h2 className="text-lg font-bold mb-3 bg-gray-100 p-2 border border-gray-300">
            Group: {group}
          </h2>
          
          {items.map((item) => {
            const subcategoryTotal = subcategoryTotals[item.id];
            const itemTotal = calculateBudgetItemTotal(item, subcategoryTotal, false);
            return (
              <div key={item.id} className="mb-4 border border-gray-300 p-3">
                <div className="grid grid-cols-1 gap-2 text-sm">
                  <div className="flex justify-between border-b pb-1">
                    <span className="font-semibold">Cost Code:</span>
                    <span>{item.cost_codes?.code}</span>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <span className="font-semibold">Name:</span>
                    <span>{item.cost_codes?.name}</span>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <span className="font-semibold">Quantity:</span>
                    <span>{item.quantity || 0}</span>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <span className="font-semibold">Unit:</span>
                    <span>{formatUnitOfMeasure(item.cost_codes?.unit_of_measure)}</span>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <span className="font-semibold">Unit Price:</span>
                    <span>{formatCurrency(item.unit_price || 0)}</span>
                  </div>
                  <div className="flex justify-between pt-1">
                    <span className="font-bold">Total:</span>
                    <span className="font-bold">{formatCurrency(itemTotal)}</span>
                  </div>
                </div>
              </div>
            );
          })}
          
          <div className="bg-gray-100 p-2 border border-gray-300 font-bold">
            <div className="flex justify-between">
              <span>Group Total:</span>
              <span>{formatCurrency(calculateGroupTotal(items))}</span>
            </div>
          </div>
        </div>
      ))}

      <div className="print-footer mt-6 pt-4 border-t-2 border-gray-300">
        <p className="text-center text-sm text-gray-500 mb-4">
          Generated on {new Date().toLocaleDateString()}
        </p>
        <div className="text-right">
          <p className="text-xl font-bold">Total Budget: {formatCurrency(totalBudget)}</p>
        </div>
      </div>
    </div>
  );
}
