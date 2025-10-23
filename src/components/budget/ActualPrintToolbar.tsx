import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Printer, Upload, ChevronsDownUp, ChevronsUpDown } from 'lucide-react';
import { ActualCostsImportDialog } from './ActualCostsImportDialog';

interface ActualPrintToolbarProps {
  onPrint: () => void;
  budgetItems: any[];
  onUpdateActual: (itemId: string, actualAmount: number) => void;
  onExpandAll?: () => void;
  onCollapseAll?: () => void;
}

export function ActualPrintToolbar({ onPrint, budgetItems, onUpdateActual, onExpandAll, onCollapseAll }: ActualPrintToolbarProps) {
  const [showImportDialog, setShowImportDialog] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between border-b pb-4 mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">Actual</h3>
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
          <Button 
            onClick={() => setShowImportDialog(true)} 
            variant="outline" 
            size="sm"
          >
            <Upload className="h-4 w-4 mr-2" />
            Import Excel
          </Button>
          <Button onClick={onPrint} variant="outline" size="sm">
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      <ActualCostsImportDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        budgetItems={budgetItems}
        onUpdateActual={onUpdateActual}
      />
    </>
  );
}