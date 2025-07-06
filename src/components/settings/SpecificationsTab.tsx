
import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { BulkActionBar } from './BulkActionBar';
import { SpecificationsTable } from './SpecificationsTable';
import { useCostCodeGrouping } from '@/hooks/useCostCodeGrouping';
import type { Tables } from '@/integrations/supabase/types';

type CostCode = Tables<'cost_codes'>;

interface SpecificationsTabProps {
  specifications: CostCode[];
  loading: boolean;
  selectedSpecifications: Set<string>;
  collapsedGroups: Set<string>;
  onSpecificationSelect: (specId: string, checked: boolean) => void;
  onSelectAllSpecifications: (checked: boolean) => void;
  onToggleGroupCollapse: (groupKey: string) => void;
  onBulkDeleteSpecifications: () => void;
  onEditSpecification: (costCode: CostCode) => void;
  onUpdateSpecification: (specId: string, updatedSpec: any) => void;
  onDeleteSpecification: (spec: CostCode) => void;
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
  onEditSpecification,
  onUpdateSpecification,
  onDeleteSpecification
}: SpecificationsTabProps) {
  const { parentCodes, groupedCostCodes, getParentCostCode } = useCostCodeGrouping(specifications);
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
        groupedSpecifications={groupedCostCodes}
        parentCodes={parentCodes}
        onSpecificationSelect={onSpecificationSelect}
        onSelectAllSpecifications={onSelectAllSpecifications}
        onToggleGroupCollapse={onToggleGroupCollapse}
        onUpdateSpecification={onUpdateSpecification}
        onEditSpecification={onEditSpecification}
        onDeleteSpecification={onDeleteSpecification}
        getParentCostCode={getParentCostCode}
      />
    </div>
  );
}
