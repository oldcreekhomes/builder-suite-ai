import React from 'react';
import { Button } from '@/components/ui/button';
import { Printer, Plus as PlusIcon, ChevronsUpDown, ChevronsDownUp, FileDown, Lock, LockOpen } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';
import { LotSelector } from './LotSelector';

interface BudgetPrintToolbarProps {
  projectId: string;
  onPrint: () => void;
  onExportPdf: () => void;
  onAddBudget: () => void;
  onToggleExpandCollapse?: () => void;
  allExpanded?: boolean;
  isExportingPdf?: boolean;
  isLocked?: boolean;
  canLockBudgets?: boolean;
  onLockToggle?: () => void;
}

export function BudgetPrintToolbar({ 
  projectId,
  onPrint, 
  onExportPdf, 
  onAddBudget, 
  onToggleExpandCollapse, 
  allExpanded, 
  isExportingPdf,
  isLocked = false,
  canLockBudgets = false,
  onLockToggle,
}: BudgetPrintToolbarProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Budget</h1>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={canLockBudgets ? onLockToggle : undefined}
                  disabled={!canLockBudgets}
                  className={cn(
                    "p-1 rounded transition-colors",
                    canLockBudgets 
                      ? "cursor-pointer hover:bg-accent" 
                      : "cursor-not-allowed opacity-50"
                  )}
                >
                  {isLocked ? (
                    <Lock className="h-5 w-5 text-red-600" />
                  ) : (
                    <LockOpen className="h-5 w-5 text-green-600" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent>
                {!canLockBudgets ? (
                  <p>No access. Contact admin.</p>
                ) : isLocked ? (
                  <p>Budget is locked. Click to unlock.</p>
                ) : (
                  <p>Budget is unlocked. Click to lock.</p>
                )}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
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
          <LotSelector projectId={projectId} />
          <Button onClick={onAddBudget} variant="outline" size="sm">
            <PlusIcon className="h-4 w-4 mr-2" />
            Budget
          </Button>
          <Button onClick={onExportPdf} variant="outline" size="sm" disabled={isExportingPdf}>
            <FileDown className="h-4 w-4 mr-2" />
            {isExportingPdf ? 'Exporting...' : 'Export PDF'}
          </Button>
        </div>
      </div>
      <p className="text-muted-foreground">
        Manage budget for this project
      </p>
    </div>
  );
}
