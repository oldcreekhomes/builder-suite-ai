import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Printer, Plus as PlusIcon, ChevronsUpDown, ChevronsDownUp, FileDown, Upload, Search } from 'lucide-react';
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
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
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
  searchQuery,
  onSearchChange,
}: BudgetPrintToolbarProps) {
  return (
    <div className="flex items-center justify-end gap-2">
      {onSearchChange && (
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search budget..."
            value={searchQuery ?? ''}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      )}
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
