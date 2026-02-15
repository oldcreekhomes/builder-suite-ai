
import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { CostCodesHeader } from './CostCodesHeader';
import { CostCodesTable } from './CostCodesTable';
import { CostCodeTemplateDialog } from './CostCodeTemplateDialog';
import { useCostCodeGrouping } from '@/hooks/useCostCodeGrouping';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
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
  onRefetch?: () => void;
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
  isEditing = false,
  onRefetch
}: CostCodesTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [addDialogOpen, setAddDialogOpen] = React.useState(false);
  const [addDialogInitialData, setAddDialogInitialData] = React.useState<{ parent_group?: string } | undefined>();
  const [excelDialogOpen, setExcelDialogOpen] = React.useState(false);
  const { toast } = useToast();

  // Show template dialog when no cost codes exist and not loading
  const templateDialogOpen = costCodes.length === 0 && !loading;

  // Filter cost codes based on search query - include parents when children match
  const filteredCostCodes = useMemo(() => {
    if (!searchQuery.trim()) return costCodes;
    const query = searchQuery.toLowerCase();
    
    const directMatches = costCodes.filter(cc => 
      cc.code.toLowerCase().includes(query) ||
      cc.name.toLowerCase().includes(query)
    );
    
    const parentGroupsToInclude = new Set<string>();
    directMatches.forEach(cc => {
      if (cc.parent_group) {
        parentGroupsToInclude.add(cc.parent_group.trim());
      }
    });
    
    return costCodes.filter(cc => 
      cc.code.toLowerCase().includes(query) ||
      cc.name.toLowerCase().includes(query) ||
      parentGroupsToInclude.has(cc.code.trim())
    );
  }, [costCodes, searchQuery]);

  const { parentCodes, groupedCostCodes, getParentCostCode } = useCostCodeGrouping(filteredCostCodes);

  const handleAddCostCode = (parentCode?: string) => {
    setAddDialogInitialData(parentCode ? { parent_group: parentCode } : undefined);
    setAddDialogOpen(true);
  };

  const handleUseTemplate = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Error", description: "You must be logged in", variant: "destructive" });
        return;
      }

      const response = await supabase.functions.invoke('copy-template-cost-codes', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to import template');
      }

      const result = response.data;
      toast({
        title: "Template Imported!",
        description: `Successfully imported ${result.costCodesImported} cost codes and ${result.specificationsImported} specifications.`,
      });

      onRefetch?.();
    } catch (error: any) {
      console.error('Template import error:', error);
      toast({
        title: "Import Failed",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleTemplateImportExcel = () => {
    setExcelDialogOpen(true);
  };

  const handleAddManually = () => {
    setAddDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <CostCodeTemplateDialog
        open={templateDialogOpen}
        onOpenChange={() => {}}
        onUseTemplate={handleUseTemplate}
        onImportExcel={handleTemplateImportExcel}
        onAddManually={handleAddManually}
      />

      <CostCodesHeader
        selectedCostCodes={selectedCostCodes}
        costCodes={costCodes}
        onBulkDeleteCostCodes={onBulkDeleteCostCodes}
        onImportCostCodes={onImportCostCodes}
        onAddCostCode={onAddCostCode}
        addDialogInitialData={addDialogInitialData}
        addDialogOpen={addDialogOpen}
        onAddDialogOpenChange={setAddDialogOpen}
        excelDialogOpen={excelDialogOpen}
        onExcelDialogOpenChange={setExcelDialogOpen}
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
