
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
    
    // If we found an actual parent cost code, use it
    if (parentCostCode) {
      let parentSpec = specifications.find(spec => spec.cost_code.id === parentCostCode.id);
      
      if (!parentSpec) {
        parentSpec = {
          id: parentCostCode.id,
          cost_code_id: parentCostCode.id,
          description: null,
          files: null,
          created_at: '',
          updated_at: '',
          cost_code: parentCostCode
        } as SpecificationWithCostCode;
      }
      
      return parentSpec;
    }
    
    // If no parent cost code exists, derive info from child cost codes
    const childSpecs = specifications.filter(spec => 
      spec.cost_code.parent_group === parentGroupCode || 
      spec.cost_code.code.startsWith(parentGroupCode)
    );
    
    if (childSpecs.length > 0) {
      // Use the first child's data to create a virtual parent
      const firstChild = childSpecs[0];
      return {
        id: `virtual-${parentGroupCode}`,
        cost_code_id: `virtual-${parentGroupCode}`,
        description: null,
        files: null,
        created_at: '',
        updated_at: '',
        cost_code: {
          ...firstChild.cost_code,
          id: `virtual-${parentGroupCode}`,
          code: parentGroupCode,
          name: firstChild.cost_code.name // Use the child's name as the base for the group
        }
      } as SpecificationWithCostCode;
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
