
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
  priceHistoryCounts?: Record<string, number>;
  onCostCodeSelect: (costCodeId: string, checked: boolean) => void;
  onSelectAllCostCodes: (checked: boolean) => void;
  onToggleGroupCollapse: (groupKey: string) => void;
  onAddCostCode: (newCostCode: any) => void;
  onUpdateCostCode: (costCodeId: string, updatedCostCode: any) => void;
  onEditCostCode: (costCode: CostCode) => void;
  onDeleteCostCode: (costCode: CostCode) => void;
  onImportCostCodes: (importedCostCodes: any[]) => void;
  onBulkDeleteCostCodes: () => void;
  onPriceSync?: () => void;
}

export function CostCodesTab({
  costCodes,
  loading,
  selectedCostCodes,
  collapsedGroups,
  priceHistoryCounts = {},
  onCostCodeSelect,
  onSelectAllCostCodes,
  onToggleGroupCollapse,
  onAddCostCode,
  onUpdateCostCode,
  onEditCostCode,
  onDeleteCostCode,
  onImportCostCodes,
  onBulkDeleteCostCodes,
  onPriceSync
}: CostCodesTabProps) {
  const { parentCodes, groupedCostCodes, getParentCostCode } = useCostCodeGrouping(costCodes);
  const [addDialogOpen, setAddDialogOpen] = React.useState(false);
  const [addDialogInitialData, setAddDialogInitialData] = React.useState<{ parent_group?: string } | undefined>();

  const handleAddCostCode = (parentCode?: string) => {
    // Set initial data and open dialog
    setAddDialogInitialData(parentCode ? { parent_group: parentCode } : undefined);
    setAddDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <CostCodesHeader
        selectedCostCodes={selectedCostCodes}
        costCodes={costCodes}
        onBulkDeleteCostCodes={onBulkDeleteCostCodes}
        onImportCostCodes={onImportCostCodes}
        onAddCostCode={onAddCostCode}
        addDialogInitialData={addDialogInitialData}
        addDialogOpen={addDialogOpen}
        onAddDialogOpenChange={setAddDialogOpen}
      />
      
      <CostCodesTable
        costCodes={costCodes}
        loading={loading}
        selectedCostCodes={selectedCostCodes}
        collapsedGroups={collapsedGroups}
        groupedCostCodes={groupedCostCodes}
        parentCodes={parentCodes}
        priceHistoryCounts={priceHistoryCounts}
        onCostCodeSelect={onCostCodeSelect}
        onSelectAllCostCodes={onSelectAllCostCodes}
        onToggleGroupCollapse={onToggleGroupCollapse}
        onUpdateCostCode={onUpdateCostCode}
        onEditCostCode={onEditCostCode}
        onDeleteCostCode={onDeleteCostCode}
        getParentCostCode={getParentCostCode}
        onAddCostCode={handleAddCostCode}
        onAddSubcategory={onAddCostCode}
        onPriceSync={onPriceSync}
      />
    </div>
  );
}
