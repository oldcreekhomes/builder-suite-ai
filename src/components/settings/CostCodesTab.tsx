
import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
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
  isEditing?: boolean;
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
  onPriceSync,
  isEditing = false
}: CostCodesTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [addDialogOpen, setAddDialogOpen] = React.useState(false);
  const [addDialogInitialData, setAddDialogInitialData] = React.useState<{ parent_group?: string } | undefined>();

  // Filter cost codes based on search query - include parents when children match
  const filteredCostCodes = useMemo(() => {
    if (!searchQuery.trim()) return costCodes;
    const query = searchQuery.toLowerCase();
    
    // First, find all codes that directly match the search
    const directMatches = costCodes.filter(cc => 
      cc.code.toLowerCase().includes(query) ||
      cc.name.toLowerCase().includes(query)
    );
    
    // Collect parent codes that need to be included for hierarchy rendering
    const parentGroupsToInclude = new Set<string>();
    directMatches.forEach(cc => {
      if (cc.parent_group) {
        parentGroupsToInclude.add(cc.parent_group.trim());
      }
    });
    
    // Include both direct matches AND their parent codes
    return costCodes.filter(cc => 
      cc.code.toLowerCase().includes(query) ||
      cc.name.toLowerCase().includes(query) ||
      parentGroupsToInclude.has(cc.code.trim())
    );
  }, [costCodes, searchQuery]);

  const { parentCodes, groupedCostCodes, getParentCostCode } = useCostCodeGrouping(filteredCostCodes);

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
      
      <div className="relative w-64">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>
      
      <CostCodesTable
        costCodes={filteredCostCodes}
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
        isEditing={isEditing}
      />
    </div>
  );
}
