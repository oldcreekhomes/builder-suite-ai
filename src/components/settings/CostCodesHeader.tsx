
import React from 'react';
import { AddCostCodeDialog } from '@/components/AddCostCodeDialog';
import { ExcelImportDialog } from '@/components/ExcelImportDialog';
import { BulkActionBar } from './BulkActionBar';
import type { Tables } from '@/integrations/supabase/types';

type CostCode = Tables<'cost_codes'>;

interface CostCodesHeaderProps {
  selectedCostCodes: Set<string>;
  costCodes: CostCode[];
  onBulkDeleteCostCodes: () => void;
  onImportCostCodes: (importedCostCodes: any[]) => void;
  onAddCostCode: (newCostCode: any) => void;
}

export function CostCodesHeader({
  selectedCostCodes,
  costCodes,
  onBulkDeleteCostCodes,
  onImportCostCodes,
  onAddCostCode
}: CostCodesHeaderProps) {
  return (
    <div className="flex justify-between items-center">
      <div>
        <h3 className="text-lg font-semibold text-black">Cost Codes</h3>
        {selectedCostCodes.size > 0 && (
          <p className="text-sm text-gray-600">
            {selectedCostCodes.size} item{selectedCostCodes.size !== 1 ? 's' : ''} selected
          </p>
        )}
      </div>
      <div className="flex gap-2">
        <BulkActionBar
          selectedCount={selectedCostCodes.size}
          onBulkDelete={onBulkDeleteCostCodes}
          label="cost codes"
        />
        <ExcelImportDialog onImportCostCodes={onImportCostCodes} />
        <AddCostCodeDialog 
          existingCostCodes={costCodes.map(cc => ({ code: cc.code, name: cc.name }))}
          onAddCostCode={onAddCostCode}
        />
      </div>
    </div>
  );
}
