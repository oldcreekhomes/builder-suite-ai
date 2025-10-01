
import React from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Edit, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { CostCodeInlineEditor } from '@/components/CostCodeInlineEditor';
import type { Tables } from '@/integrations/supabase/types';

type CostCode = Tables<'cost_codes'>;

interface CostCodeGroupRowProps {
  groupKey: string;
  parentCostCode: CostCode | undefined;
  isCollapsed: boolean;
  isSelected: boolean;
  onToggleCollapse: (groupKey: string) => void;
  onSelect: (id: string, checked: boolean) => void;
  onEdit: (costCode: CostCode) => void;
  onDelete: (costCode: CostCode) => void;
  onUpdate: (costCodeId: string, updates: any) => void;
}

export function CostCodeGroupRow({
  groupKey,
  parentCostCode,
  isCollapsed,
  isSelected,
  onToggleCollapse,
  onSelect,
  onEdit,
  onDelete,
  onUpdate
}: CostCodeGroupRowProps) {
  return (
    <TableRow className="bg-gray-50 h-10">
      <TableCell className="py-1">
        {parentCostCode && (
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => 
              onSelect(parentCostCode.id, checked as boolean)
            }
          />
        )}
      </TableCell>
      <TableCell 
        className="font-semibold text-gray-700 cursor-pointer py-1 text-sm"
        onClick={() => onToggleCollapse(groupKey)}
      >
        <div className="flex items-center gap-2">
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
          <span>{groupKey}</span>
        </div>
      </TableCell>
      <TableCell className="font-semibold text-gray-700 py-1 text-sm">
        {parentCostCode?.name}
      </TableCell>
      <TableCell className="py-1">
        {parentCostCode && (
          <CostCodeInlineEditor
            costCode={parentCostCode}
            field="quantity"
            onUpdate={onUpdate}
          />
        )}
      </TableCell>
      <TableCell className="py-1">
        {parentCostCode && (
          <CostCodeInlineEditor
            costCode={parentCostCode}
            field="price"
            onUpdate={onUpdate}
          />
        )}
      </TableCell>
      <TableCell className="py-1">
        {parentCostCode && (
          <CostCodeInlineEditor
            costCode={parentCostCode}
            field="unit_of_measure"
            onUpdate={onUpdate}
          />
        )}
      </TableCell>
      <TableCell className="py-1">
        {parentCostCode && (
          <CostCodeInlineEditor
            costCode={parentCostCode}
            field="has_specifications"
            onUpdate={onUpdate}
          />
        )}
      </TableCell>
      <TableCell className="py-1">
        {parentCostCode && (
          <CostCodeInlineEditor
            costCode={parentCostCode}
            field="has_bidding"
            onUpdate={onUpdate}
          />
        )}
      </TableCell>
      <TableCell className="py-1">
        {parentCostCode && (
          <CostCodeInlineEditor
            costCode={parentCostCode}
            field="has_subcategories"
            onUpdate={onUpdate}
          />
        )}
      </TableCell>
      <TableCell className="py-1">
        {parentCostCode && (
          <div className="flex gap-1">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(parentCostCode);
              }}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(parentCostCode);
              }}
              className="text-red-600 hover:text-red-800 hover:bg-red-100"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </TableCell>
    </TableRow>
  );
}
