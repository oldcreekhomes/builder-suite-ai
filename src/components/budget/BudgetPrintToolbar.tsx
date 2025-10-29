
import React from 'react';
import { Button } from '@/components/ui/button';
import { Printer, Plus as PlusIcon, ChevronsDownUp, ChevronsUpDown } from 'lucide-react';
import { BudgetColumnVisibilityDropdown, VisibleColumns } from './BudgetColumnVisibilityDropdown';

interface BudgetPrintToolbarProps {
  onPrint: () => void;
  onAddBudget: () => void;
  visibleColumns: VisibleColumns;
  onToggleColumn: (column: keyof VisibleColumns) => void;
  onExpandAll?: () => void;
  onCollapseAll?: () => void;
}

export function BudgetPrintToolbar({ onPrint, onAddBudget, visibleColumns, onToggleColumn, onExpandAll, onCollapseAll }: BudgetPrintToolbarProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Budget</h1>
          <p className="text-muted-foreground">
            Manage budget for this project
          </p>
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
          <BudgetColumnVisibilityDropdown 
            visibleColumns={visibleColumns}
            onToggleColumn={onToggleColumn}
          />
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
    </div>
  );
}
