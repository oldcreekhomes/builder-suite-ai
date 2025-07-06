import React from 'react';
import { TableRow, TableCell } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, Edit, Trash2 } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type CostCode = Tables<'cost_codes'>;
type CostCodeSpecification = Tables<'cost_code_specifications'>;

// Combined type for specifications with cost code data
type SpecificationWithCostCode = CostCodeSpecification & {
  cost_code: CostCode;
};

interface SpecificationGroupRowProps {
  groupKey: string;
  parentCostCode?: SpecificationWithCostCode;
  isCollapsed: boolean;
  isSelected: boolean;
  onToggleCollapse: (groupKey: string) => void;
  onSelect: (specId: string, checked: boolean) => void;
  onEditDescription: (spec: SpecificationWithCostCode) => void;
  onDelete: (spec: SpecificationWithCostCode) => void;
  onUpdate: (specId: string, updatedSpec: any) => void;
  onFileUpload: (specId: string) => void;
  onDeleteAllFiles: (specId: string) => void;
}

export function SpecificationGroupRow({
  groupKey,
  parentCostCode,
  isCollapsed,
  isSelected,
  onToggleCollapse,
  onSelect,
  onEditDescription,
  onDelete,
  onUpdate,
  onFileUpload,
  onDeleteAllFiles
}: SpecificationGroupRowProps) {
  return (
    <TableRow className="bg-gray-50 border-b-2 border-gray-200 font-medium">
      <TableCell className="py-2">
        {parentCostCode && (
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => onSelect(parentCostCode.id, checked as boolean)}
          />
        )}
      </TableCell>
      <TableCell className="py-2">
        <div className="flex items-center">
          <button
            onClick={() => onToggleCollapse(groupKey)}
            className="hover:bg-gray-100 rounded p-1 mr-2"
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
          <span className="font-semibold">
            {parentCostCode ? parentCostCode.cost_code.code : groupKey}
          </span>
        </div>
      </TableCell>
      <TableCell className="py-2 font-semibold">
        {parentCostCode ? parentCostCode.cost_code.name : groupKey}
      </TableCell>
      <TableCell className="py-2">
        {parentCostCode?.description || 'Group description'}
      </TableCell>
      <TableCell className="py-2">
        {parentCostCode?.files ? (Array.isArray(parentCostCode.files) ? parentCostCode.files.length : JSON.parse(parentCostCode.files as string).length) : 0} files
      </TableCell>
      <TableCell className="py-2">
        {parentCostCode && (
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEditDescription(parentCostCode)}
              className="h-7 w-7 p-0"
            >
              <Edit className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(parentCostCode)}
              className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        )}
      </TableCell>
    </TableRow>
  );
}