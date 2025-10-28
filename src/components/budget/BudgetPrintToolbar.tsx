
import React from 'react';
import { Button } from '@/components/ui/button';
import { Printer, Plus as PlusIcon, ChevronsDownUp, ChevronsUpDown } from 'lucide-react';

interface BudgetPrintToolbarProps {
  onPrint: () => void;
  onAddBudget: () => void;
  onExpandAll?: () => void;
  onCollapseAll?: () => void;
}

export function BudgetPrintToolbar({ onPrint, onAddBudget, onExpandAll, onCollapseAll }: BudgetPrintToolbarProps) {
  return (
    <div className="flex items-center justify-between border-b pb-4 mb-4">
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-semibold">Budget</h3>
      </div>
      <div className="flex items-center gap-2">
        {onExpandAll && onCollapseAll && (
          <>
            <Button onClick={onExpandAll} variant="outline" size="sm">
              <ChevronsDownUp className="h-4 w-4 mr-2" />
              Expand All
            </Button>
            <Button onClick={onCollapseAll} variant="outline" size="sm">
              <ChevronsUpDown className="h-4 w-4 mr-2" />
              Collapse All
            </Button>
          </>
        )}
        <Button onClick={onAddBudget} variant="outline" size="sm">
          <PlusIcon className="h-4 w-4 mr-2" />
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
