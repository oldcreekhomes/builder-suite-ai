
import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
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
  onSpecificationSelect: (specId: string, checked: boolean) => void;
  onSelectAllSpecifications: (checked: boolean) => void;
  onToggleGroupCollapse: (groupKey: string) => void;
  onBulkDeleteSpecifications: () => void;
  onEditDescription: (spec: SpecificationWithCostCode) => void;
  onUpdateSpecification: (specId: string, updatedSpec: any) => void;
  onDeleteSpecification: (spec: SpecificationWithCostCode) => void;
  onFileUpload: (specId: string) => void;
  onDeleteAllFiles: (specId: string) => void;
}

export function SpecificationsTab({
  specifications,
  loading,
  selectedSpecifications,
  collapsedGroups,
  onSpecificationSelect,
  onSelectAllSpecifications,
  onToggleGroupCollapse,
  onBulkDeleteSpecifications,
  onEditDescription,
  onUpdateSpecification,
  onDeleteSpecification,
  onFileUpload,
  onDeleteAllFiles
}: SpecificationsTabProps) {
  const { parentCodes, groupedCostCodes, getParentCostCode } = useCostCodeGrouping(
    specifications.map(spec => spec.cost_code)
  );
  
  // Convert grouped cost codes back to specifications format
  const groupedSpecifications = Object.entries(groupedCostCodes).reduce((acc, [key, costCodes]) => {
    acc[key] = specifications.filter(spec => 
      costCodes.some(costCode => costCode.id === spec.cost_code.id)
    );
    return acc;
  }, {} as Record<string, SpecificationWithCostCode[]>);

  const getParentSpecification = (parentGroupCode: string): SpecificationWithCostCode | undefined => {
    const parentCostCode = getParentCostCode(parentGroupCode);
    if (!parentCostCode) return undefined;
    return specifications.find(spec => spec.cost_code.id === parentCostCode.id);
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
            onBulkDelete={onBulkDeleteSpecifications}
            label="specifications"
          />
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Specification
          </Button>
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
        onDeleteAllFiles={onDeleteAllFiles}
        getParentCostCode={getParentSpecification}
      />
    </div>
  );
}
