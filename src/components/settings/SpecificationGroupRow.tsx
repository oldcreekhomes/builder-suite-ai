import React from 'react';
import { TableRow, TableCell } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, Edit, Trash2 } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type CostCode = Tables<'cost_codes'>;

interface SpecificationGroupRowProps {
  groupKey: string;
  parentCostCode?: CostCode;
  isCollapsed: boolean;
  isSelected: boolean;
  onToggleCollapse: (groupKey: string) => void;
  onSelect: (specId: string, checked: boolean) => void;
  onEdit: (spec: CostCode) => void;
  onDelete: (spec: CostCode) => void;
  onUpdate: (specId: string, updatedSpec: any) => void;
}

export function SpecificationGroupRow({
  groupKey,
  parentCostCode,
  isCollapsed,
  isSelected,
  onToggleCollapse,
  onSelect,
  onEdit,
  onDelete,
  onUpdate
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
            {parentCostCode ? parentCostCode.code : groupKey}
          </span>
        </div>
      </TableCell>
      <TableCell className="py-2 font-semibold">
        {parentCostCode ? parentCostCode.name : `${groupKey} Group`}
      </TableCell>
      <TableCell className="py-2">
        {parentCostCode?.category || 'N/A'}
      </TableCell>
      <TableCell className="py-2">
        {parentCostCode?.unit_of_measure || 'N/A'}
      </TableCell>
      <TableCell className="py-2">
        {parentCostCode && (
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(parentCostCode)}
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