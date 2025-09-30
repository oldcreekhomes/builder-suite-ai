import React from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Edit, Trash2, ChevronRight, ChevronDown, Plus } from 'lucide-react';
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
  isExpanded?: boolean;
  onToggleExpand?: (code: string) => void;
  childCodes?: CostCode[];
  onAddSubcategory?: (parentCode: string) => void;
  level?: number;
}

export function CostCodeTableRow({
  costCode,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  onUpdate,
  isGrouped = false,
  isExpanded = false,
  onToggleExpand,
  childCodes = [],
  onAddSubcategory,
  level = 0
}: CostCodeTableRowProps) {
  const hasSubcategories = costCode.has_subcategories;
  const indentLevel = isGrouped ? 1 : level;
  
  return (
    <>
      <TableRow className="h-8">
        <TableCell className="py-1">
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => onSelect(costCode.id, checked as boolean)}
          />
        </TableCell>
        <TableCell className="font-medium py-1 text-sm">
          <div className="flex items-center gap-1" style={{ paddingLeft: `${indentLevel * 24}px` }}>
            {hasSubcategories && onToggleExpand && (
              <button
                onClick={() => onToggleExpand(costCode.code)}
                className="p-0 hover:bg-accent rounded"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            )}
            <span>{costCode.code}</span>
          </div>
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
          <CostCodeInlineEditor
            costCode={costCode}
            field="has_subcategories"
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

      {/* Render child rows when expanded */}
      {hasSubcategories && isExpanded && (
        <>
          {childCodes.map((childCode) => (
            <CostCodeTableRow
              key={childCode.id}
              costCode={childCode}
              isSelected={isSelected}
              onSelect={onSelect}
              onEdit={onEdit}
              onDelete={onDelete}
              onUpdate={onUpdate}
              isGrouped={false}
              level={level + 1}
            />
          ))}
          
          {/* Add Subcategory Button Row */}
          {onAddSubcategory && (
            <TableRow className="h-8 bg-muted/30">
              <TableCell className="py-1"></TableCell>
              <TableCell colSpan={9} className="py-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onAddSubcategory(costCode.code)}
                  className="h-6 text-xs"
                  style={{ marginLeft: `${(level + 1) * 24}px` }}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Subcategory
                </Button>
              </TableCell>
            </TableRow>
          )}
        </>
      )}
    </>
  );
}
