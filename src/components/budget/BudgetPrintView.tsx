
import React from 'react';
import { formatUnitOfMeasure } from '@/utils/budgetUtils';

interface BudgetPrintViewProps {
  budgetItems: any[];
  groupedBudgetItems: Record<string, any[]>;
  projectAddress?: string;
}

export function BudgetPrintView({ budgetItems, groupedBudgetItems, projectAddress }: BudgetPrintViewProps) {
  const formatCurrency = (amount: number) => {
    return `$${Math.round(amount).toLocaleString()}`;
  };

  const totalBudget = budgetItems.reduce(
    (sum, item) => sum + ((item.quantity || 0) * (item.unit_price || 0)), 
    0
  );

  const calculateGroupTotal = (items: any[]) => {
    return items.reduce((sum, item) => sum + ((item.quantity || 0) * (item.unit_price || 0)), 0);
  };

  const getCurrentDateTime = () => {
    const now = new Date();
    const date = now.toLocaleDateString();
    const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `${date}, ${time}`;
  };

  return (
    <div className="print-content hidden">
      {Object.entries(groupedBudgetItems).map(([group, items]) => (
        <div key={group} className="mb-6">
          <table className="w-full border-collapse border border-gray-300 mb-2">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-300 p-1 text-left text-sm">Cost Code</th>
                <th className="border border-gray-300 p-1 text-left text-sm">Name</th>
                <th className="border border-gray-300 p-1 text-right text-sm">Quantity</th>
                <th className="border border-gray-300 p-1 text-left text-sm">Unit</th>
                <th className="border border-gray-300 p-1 text-right text-sm">Unit Price</th>
                <th className="border border-gray-300 p-1 text-right text-sm">Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="border border-gray-300 p-1 text-sm">{item.cost_codes?.code}</td>
                  <td className="border border-gray-300 p-1 text-sm">{item.cost_codes?.name}</td>
                  <td className="border border-gray-300 p-1 text-right text-sm">{item.quantity || 0}</td>
                  <td className="border border-gray-300 p-1 text-sm">{formatUnitOfMeasure(item.cost_codes?.unit_of_measure)}</td>
                  <td className="border border-gray-300 p-1 text-right text-sm">{formatCurrency(item.unit_price || 0)}</td>
                  <td className="border border-gray-300 p-1 text-right text-sm">
                    {formatCurrency((item.quantity || 0) * (item.unit_price || 0))}
                  </td>
                </tr>
              ))}
              <tr className="bg-gray-50 font-semibold">
                <td colSpan={5} className="border border-gray-300 p-1 text-right text-sm">Group Total:</td>
                <td className="border border-gray-300 p-1 text-right text-sm">{formatCurrency(calculateGroupTotal(items))}</td>
              </tr>
            </tbody>
          </table>
        </div>
      ))}

      <div className="print-footer mt-6 pt-4 border-t-2 border-gray-300">
        <div className="flex justify-between items-center mb-4">
          <p className="text-sm text-gray-500">
            {getCurrentDateTime()}
          </p>
          <div className="text-right">
            <p className="text-lg font-bold">Project Budget - {projectAddress}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold">Total Budget: {formatCurrency(totalBudget)}</p>
        </div>
      </div>
    </div>
  );
}
