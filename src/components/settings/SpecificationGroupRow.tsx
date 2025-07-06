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
        </div>
      </TableCell>
      <TableCell className="py-2 text-left">
        <span className="font-semibold">
          {parentCostCode ? parentCostCode.cost_code.code : groupKey}
        </span>
      </TableCell>
      <TableCell className="py-2 font-semibold">
        {parentCostCode ? parentCostCode.cost_code.name : groupKey}
      </TableCell>
      <TableCell className="py-2">
        {/* Empty description cell */}
      </TableCell>
      <TableCell className="py-2">
        {/* Empty files cell */}
      </TableCell>
      <TableCell className="py-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => parentCostCode && onDelete(parentCostCode)}
          className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
          title="Delete group"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </TableCell>
    </TableRow>
  );
}