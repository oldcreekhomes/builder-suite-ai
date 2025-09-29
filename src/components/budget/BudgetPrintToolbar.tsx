
import React from 'react';
import { Button } from '@/components/ui/button';
import { Printer, Plus } from 'lucide-react';

interface BudgetPrintToolbarProps {
  onPrint: () => void;
  onAddBudget: () => void;
}

export function BudgetPrintToolbar({ onPrint, onAddBudget }: BudgetPrintToolbarProps) {
  return (
    <div className="flex items-center justify-between border-b pb-4 mb-4">
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-semibold">Budget</h3>
      </div>
      <div className="flex items-center gap-2">
        <Button onClick={onAddBudget} variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Budget
        </Button>
        <Button onClick={onPrint} variant="outline" size="sm">
          <Printer className="h-4 w-4 mr-2" />
          Print
        </Button>
      </div>
    </div>
  );
}
