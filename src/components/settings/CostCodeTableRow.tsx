
import React from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Edit, Trash2 } from 'lucide-react';
import { CostCodeInlineEditor } from '@/components/CostCodeInlineEditor';
import type { Tables } from '@/integrations/supabase/types';

type CostCode = Tables<'cost_codes'>;

interface CostCodeTableRowProps {
  costCode: CostCode;
  isSelected: boolean;
  onSelect: (id: string, checked: boolean) => void;
  onEdit: (costCode: CostCode) => void;
  onDelete: (costCode: CostCode) => void;
  onUpdate: (costCodeId: string, updates: any) => void;
  isGrouped?: boolean;
}

export function CostCodeTableRow({
  costCode,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  onUpdate,
  isGrouped = false
}: CostCodeTableRowProps) {
  return (
    <TableRow className="h-8">
      <TableCell className="py-1">
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => onSelect(costCode.id, checked as boolean)}
        />
      </TableCell>
      <TableCell className="font-medium py-1 text-sm">
        {isGrouped && <span className="ml-6"></span>}
        {costCode.code}
      </TableCell>
      <TableCell className="py-1 text-sm">{costCode.name}</TableCell>
      <TableCell className="py-1">
        <CostCodeInlineEditor
          costCode={costCode}
          field="quantity"
          onUpdate={onUpdate}
        />
      </TableCell>
      <TableCell className="py-1">
        <CostCodeInlineEditor
          costCode={costCode}
          field="price"
          onUpdate={onUpdate}
        />
      </TableCell>
      <TableCell className="py-1">
        <CostCodeInlineEditor
          costCode={costCode}
          field="unit_of_measure"
          onUpdate={onUpdate}
        />
      </TableCell>
      <TableCell className="py-1">
        <CostCodeInlineEditor
          costCode={costCode}
          field="has_specifications"
          onUpdate={onUpdate}
        />
      </TableCell>
      <TableCell className="py-1">
        <CostCodeInlineEditor
          costCode={costCode}
          field="has_bidding"
          onUpdate={onUpdate}
        />
      </TableCell>
      <TableCell className="py-1">
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => onEdit(costCode)}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => onDelete(costCode)}
            className="text-red-600 hover:text-red-800 hover:bg-red-100"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
