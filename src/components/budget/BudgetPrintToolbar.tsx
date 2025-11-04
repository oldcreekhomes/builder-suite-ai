import React from 'react';
import { Button } from '@/components/ui/button';
import { Printer, Plus as PlusIcon, ChevronsUpDown, ChevronsDownUp, FileDown } from 'lucide-react';

interface BudgetPrintToolbarProps {
  onPrint: () => void;
  onExportPdf: () => void;
  onAddBudget: () => void;
  onToggleExpandCollapse?: () => void;
  allExpanded?: boolean;
  isExportingPdf?: boolean;
}

export function BudgetPrintToolbar({ onPrint, onExportPdf, onAddBudget, onToggleExpandCollapse, allExpanded, isExportingPdf }: BudgetPrintToolbarProps) {
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
          {onToggleExpandCollapse && (
            <Button onClick={onToggleExpandCollapse} variant="outline" size="sm">
              {allExpanded ? (
                <ChevronsUpDown className="h-4 w-4" />
              ) : (
                <ChevronsDownUp className="h-4 w-4" />
              )}
            </Button>
          )}
          <Button onClick={onAddBudget} variant="outline" size="sm">
            <PlusIcon className="h-4 w-4 mr-2" />
            Budget
          </Button>
          <Button onClick={onExportPdf} variant="outline" size="sm" disabled={isExportingPdf}>
            <FileDown className="h-4 w-4 mr-2" />
            {isExportingPdf ? 'Exporting...' : 'Export PDF'}
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
