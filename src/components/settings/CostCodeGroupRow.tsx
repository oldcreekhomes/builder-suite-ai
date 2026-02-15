
import React from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { TableRowActions } from '@/components/ui/table-row-actions';
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
          <TableRowActions actions={[
            { label: "Edit", onClick: () => onEdit(parentCostCode) },
            { label: "Delete", onClick: () => onDelete(parentCostCode), variant: "destructive", requiresConfirmation: true, confirmTitle: "Delete Cost Code", confirmDescription: `Are you sure you want to delete "${parentCostCode.code} - ${parentCostCode.name}"? This action cannot be undone.` },
          ]} />
        )}
      </TableCell>
    </TableRow>
  );
}
