
import React from 'react';
import { BulkActionBar } from './BulkActionBar';
import { SpecificationsTable } from './SpecificationsTable';
import { useCostCodeGrouping } from '@/hooks/useCostCodeGrouping';
import type { Tables } from '@/integrations/supabase/types';

type CostCode = Tables<'cost_codes'>;
type CostCodeSpecification = Tables<'cost_code_specifications'>;

// Combined type for specifications with cost code data
type SpecificationWithCostCode = CostCodeSpecification & {
  cost_code: CostCode;
};

interface SpecificationsTabProps {
  specifications: SpecificationWithCostCode[];
  loading: boolean;
  selectedSpecifications: Set<string>;
  collapsedGroups: Set<string>;
  allCostCodes: CostCode[]; // Add this to get access to ALL cost codes including parents
  onSpecificationSelect: (specId: string, checked: boolean) => void;
  onSelectAllSpecifications: (checked: boolean) => void;
  onToggleGroupCollapse: (groupKey: string) => void;
  onBulkDeleteSpecifications: () => void;
  onEditDescription: (spec: SpecificationWithCostCode) => void;
  onUpdateSpecification: (specId: string, updatedSpec: any) => void;
  onDeleteSpecification: (spec: SpecificationWithCostCode) => void;
  onFileUpload: (specId: string) => void;
  onDeleteIndividualFile: (specId: string, fileName: string) => void;
}

export function SpecificationsTab({
  specifications,
  loading,
  selectedSpecifications,
  collapsedGroups,
  allCostCodes,
  onSpecificationSelect,
  onSelectAllSpecifications,
  onToggleGroupCollapse,
  onBulkDeleteSpecifications,
  onEditDescription,
  onUpdateSpecification,
  onDeleteSpecification,
  onFileUpload,
  onDeleteIndividualFile
}: SpecificationsTabProps) {
  // Use ALL cost codes for grouping so we can find parent codes like "4000"
  const { parentCodes, groupedCostCodes, getParentCostCode } = useCostCodeGrouping(allCostCodes, true);
  
  // Convert grouped cost codes back to specifications format with spec-centric grouping
  const groupedSpecifications = React.useMemo(() => {
    const acc: Record<string, SpecificationWithCostCode[]> = {};

    specifications.forEach(spec => {
      const parentGroup = (spec.cost_code.parent_group || '').trim();
      const key = parentGroup !== ''
        ? parentGroup
        : (parentCodes.has(spec.cost_code.code) ? spec.cost_code.code : 'ungrouped');

      if (!acc[key]) acc[key] = [];
      acc[key].push(spec);
    });

    // Keep existing group headers even if a group is empty
    Object.keys(groupedCostCodes).forEach(k => {
      const normalized = k.trim();
      if (!acc[normalized]) acc[normalized] = [];
    });

    // Sort each group's specifications by cost code for numerical order
    Object.keys(acc).forEach(groupKey => {
      acc[groupKey].sort((a, b) => a.cost_code.code.localeCompare(b.cost_code.code));
    });

    return acc;
  }, [specifications, parentCodes, groupedCostCodes]);

  const getParentSpecification = (parentGroupCode: string): SpecificationWithCostCode | undefined => {
    // First, try to find the actual parent cost code using the hook
    const parentCostCode = getParentCostCode(parentGroupCode);
    
    if (parentCostCode) {
      // We found the actual parent cost code (e.g., code "4000" with name "HOME BUILDING COSTS")
      let parentSpec = specifications.find(spec => spec.cost_code.id === parentCostCode.id);
      
      // Even if there's no specification record for the parent, create a virtual one with the correct cost code data
      if (!parentSpec) {
        parentSpec = {
          id: parentCostCode.id,
          cost_code_id: parentCostCode.id,
          description: null,
          files: null,
          created_at: '',
          updated_at: '',
          cost_code: parentCostCode  // This should have code "4000" and name "HOME BUILDING COSTS"
        } as SpecificationWithCostCode;
      }
      
      return parentSpec;
    }
    
    return undefined;
  };
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-black">Specifications</h3>
          <p className="text-sm text-gray-600">Manage your project specifications and requirements</p>
          {selectedSpecifications.size > 0 && (
            <p className="text-sm text-gray-600">
              {selectedSpecifications.size} item{selectedSpecifications.size !== 1 ? 's' : ''} selected
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <BulkActionBar
            selectedCount={selectedSpecifications.size}
            onBulkDelete={() => onBulkDeleteSpecifications()}
            label="specifications"
          />
        </div>
      </div>
      
      <SpecificationsTable
        specifications={specifications}
        loading={loading}
        selectedSpecifications={selectedSpecifications}
        collapsedGroups={collapsedGroups}
        groupedSpecifications={groupedSpecifications}
        parentCodes={parentCodes}
        onSpecificationSelect={onSpecificationSelect}
        onSelectAllSpecifications={onSelectAllSpecifications}
        onToggleGroupCollapse={onToggleGroupCollapse}
        onUpdateSpecification={onUpdateSpecification}
        onEditDescription={onEditDescription}
        onDeleteSpecification={onDeleteSpecification}
        onFileUpload={onFileUpload}
        onDeleteIndividualFile={onDeleteIndividualFile}
        getParentCostCode={getParentSpecification}
      />
    </div>
  );
}
