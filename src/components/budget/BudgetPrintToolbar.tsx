import React from 'react';
import { Button } from '@/components/ui/button';
import { Printer, Plus as PlusIcon, ChevronsUpDown, ChevronsDownUp, FileDown, Upload } from 'lucide-react';
import { LotSelector } from './LotSelector';

interface BudgetPrintToolbarProps {
  projectId: string;
  selectedLotId: string | null;
  onSelectLot: (lotId: string) => void;
  onPrint: () => void;
  onExportPdf: () => void;
  onAddBudget: () => void;
  onImportExcel?: () => void;
  onToggleExpandCollapse?: () => void;
  allExpanded?: boolean;
  isExportingPdf?: boolean;
}

export function BudgetPrintToolbar({ 
  projectId,
  selectedLotId,
  onSelectLot,
  onPrint, 
  onExportPdf, 
  onAddBudget,
  onImportExcel,
  onToggleExpandCollapse, 
  allExpanded, 
  isExportingPdf,
}: BudgetPrintToolbarProps) {
  return (
    <div className="flex items-center justify-end gap-2">
      {onToggleExpandCollapse && (
        <Button onClick={onToggleExpandCollapse} variant="outline" size="icon" className="h-9 w-9">
          {allExpanded ? (
            <ChevronsUpDown className="h-4 w-4" />
          ) : (
            <ChevronsDownUp className="h-4 w-4" />
          )}
        </Button>
      )}
      <LotSelector projectId={projectId} selectedLotId={selectedLotId} onSelectLot={onSelectLot} />
      {onImportExcel && (
        <Button onClick={onImportExcel} variant="outline" size="sm">
          <Upload className="h-4 w-4 mr-2" />
          Import Excel
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
    </div>
  );
}
