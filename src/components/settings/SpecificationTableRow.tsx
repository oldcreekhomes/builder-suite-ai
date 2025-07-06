import React from 'react';
import { TableRow, TableCell } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Edit, Trash2 } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type CostCode = Tables<'cost_codes'>;
type CostCodeSpecification = Tables<'cost_code_specifications'>;

// Combined type for specifications with cost code data
type SpecificationWithCostCode = CostCodeSpecification & {
  cost_code: CostCode;
};

interface SpecificationTableRowProps {
  specification: SpecificationWithCostCode;
  isSelected: boolean;
  isGrouped: boolean;
  onSelect: (specId: string, checked: boolean) => void;
  onEdit: (spec: SpecificationWithCostCode) => void;
  onDelete: (spec: SpecificationWithCostCode) => void;
  onUpdate: (specId: string, updatedSpec: any) => void;
}

export function SpecificationTableRow({
  specification,
  isSelected,
  isGrouped,
  onSelect,
  onEdit,
  onDelete,
  onUpdate
}: SpecificationTableRowProps) {
  return (
    <TableRow className="h-8">
      <TableCell className="py-1">
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => onSelect(specification.id, checked as boolean)}
        />
      </TableCell>
      <TableCell className={`font-medium py-1 text-sm ${isGrouped ? 'pl-8' : ''}`}>
        {specification.cost_code.code}
      </TableCell>
      <TableCell className="py-1 text-sm">
        {specification.cost_code.name}
      </TableCell>
      <TableCell className="py-1 text-sm">
        {specification.description || 'No description'}
      </TableCell>
      <TableCell className="py-1 text-sm">
        {specification.files ? (Array.isArray(specification.files) ? specification.files.length : JSON.parse(specification.files as string).length) : 0} files
      </TableCell>
      <TableCell className="py-1">
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(specification)}
            className="h-7 w-7 p-0"
          >
            <Edit className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(specification)}
            className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}