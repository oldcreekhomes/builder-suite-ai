
import React from 'react';
import { CostCodesHeader } from './CostCodesHeader';
import { CostCodesTable } from './CostCodesTable';
import { useCostCodeGrouping } from '@/hooks/useCostCodeGrouping';
import type { Tables } from '@/integrations/supabase/types';

type CostCode = Tables<'cost_codes'>;

interface CostCodesTabProps {
  costCodes: CostCode[];
  loading: boolean;
  selectedCostCodes: Set<string>;
  collapsedGroups: Set<string>;
  onCostCodeSelect: (costCodeId: string, checked: boolean) => void;
  onSelectAllCostCodes: (checked: boolean) => void;
  onToggleGroupCollapse: (groupKey: string) => void;
  onAddCostCode: (newCostCode: any) => void;
  onUpdateCostCode: (costCodeId: string, updatedCostCode: any) => void;
  onEditCostCode: (costCode: CostCode) => void;
  onDeleteCostCode: (costCode: CostCode) => void;
  onImportCostCodes: (importedCostCodes: any[]) => void;
  onBulkDeleteCostCodes: () => void;
}

export function CostCodesTab({
  costCodes,
  loading,
  selectedCostCodes,
  collapsedGroups,
  onCostCodeSelect,
  onSelectAllCostCodes,
  onToggleGroupCollapse,
  onAddCostCode,
  onUpdateCostCode,
  onEditCostCode,
  onDeleteCostCode,
  onImportCostCodes,
  onBulkDeleteCostCodes
}: CostCodesTabProps) {
  const { parentCodes, groupedCostCodes, getParentCostCode } = useCostCodeGrouping(costCodes);

  return (
    <div className="space-y-4">
      <CostCodesHeader
        selectedCostCodes={selectedCostCodes}
        costCodes={costCodes}
        onBulkDeleteCostCodes={onBulkDeleteCostCodes}
        onImportCostCodes={onImportCostCodes}
        onAddCostCode={onAddCostCode}
      />
      
      <CostCodesTable
        costCodes={costCodes}
        loading={loading}
        selectedCostCodes={selectedCostCodes}
        collapsedGroups={collapsedGroups}
        groupedCostCodes={groupedCostCodes}
        parentCodes={parentCodes}
        onCostCodeSelect={onCostCodeSelect}
        onSelectAllCostCodes={onSelectAllCostCodes}
        onToggleGroupCollapse={onToggleGroupCollapse}
        onUpdateCostCode={onUpdateCostCode}
        onEditCostCode={onEditCostCode}
        onDeleteCostCode={onDeleteCostCode}
        getParentCostCode={getParentCostCode}
      />
    </div>
  );
}
