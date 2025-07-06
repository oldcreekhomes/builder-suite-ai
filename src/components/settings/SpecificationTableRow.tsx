import React from 'react';
import { TableRow, TableCell } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Edit, Trash2 } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type CostCode = Tables<'cost_codes'>;

interface SpecificationTableRowProps {
  specification: CostCode;
  isSelected: boolean;
  isGrouped: boolean;
  onSelect: (specId: string, checked: boolean) => void;
  onEdit: (spec: CostCode) => void;
  onDelete: (spec: CostCode) => void;
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
        {specification.code}
      </TableCell>
      <TableCell className="py-1 text-sm">
        {specification.name}
      </TableCell>
      <TableCell className="py-1 text-sm">
        {specification.category || 'Uncategorized'}
      </TableCell>
      <TableCell className="py-1 text-sm">
        {specification.unit_of_measure || 'N/A'}
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