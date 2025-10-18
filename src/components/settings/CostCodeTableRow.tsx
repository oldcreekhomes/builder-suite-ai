import React, { useState } from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Edit, Trash2, ChevronRight, ChevronDown, Plus } from 'lucide-react';
import { CostCodeInlineEditor } from '@/components/CostCodeInlineEditor';
import { AddSubcategoryDialog } from '@/components/AddSubcategoryDialog';
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
  onAddSubcategory?: (costCode: any) => void;
  level?: number;
  isCodeExpanded?: (code: string) => boolean;
  allCostCodes: CostCode[];
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
  level = 0,
  isCodeExpanded,
  allCostCodes
}: CostCodeTableRowProps) {
  const [showSubcategoryDialog, setShowSubcategoryDialog] = useState(false);
  
  // Compute children dynamically based on parent_group matching this cost code's code
  const parentCode = String(costCode.code ?? '').trim();
  const computedChildren = allCostCodes.filter(cc => {
    const ccParentGroup = String(cc.parent_group ?? '').trim();
    return ccParentGroup === parentCode;
  });
  
  // Use computed children if childCodes is empty, otherwise use passed childCodes
  const childrenToRender = childCodes.length > 0 ? childCodes : computedChildren;
  
  // Determine if this row is expandable based on actual children OR has_subcategories flag
  const hasChildren = childrenToRender.length > 0;
  const isExpandable = hasChildren || costCode.has_subcategories;
  const indentLevel = isGrouped ? 1 : level;
  
  // Use isCodeExpanded if provided, otherwise fall back to isExpanded
  const expanded = isCodeExpanded ? isCodeExpanded(costCode.code) : isExpanded;

  const handleAddSubcategory = (newCostCode: any) => {
    if (onAddSubcategory) {
      onAddSubcategory(newCostCode);
    }
  };
  
  // Determine if this is a LEAF subcategory (has parent but no children)
  // Only leaf subcategories should hide specs/bidding/subcategories options
  const isLeafSubcategory = (costCode.parent_group && costCode.parent_group.trim() !== '') && !costCode.has_subcategories;
  
  return (
    <>
      <TableRow className="h-8">
        <TableCell className="py-1">
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => onSelect(costCode.id, checked as boolean)}
          />
        </TableCell>
        <TableCell className="font-medium py-1 text-sm text-right">
          <div className="flex items-center gap-1 justify-end">
            <div className="w-4 h-4 flex items-center justify-center">
              {isExpandable && onToggleExpand && (
                <button
                  onClick={() => onToggleExpand(costCode.code)}
                  className="p-0 hover:bg-accent rounded"
                >
                  {expanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
              )}
            </div>
            <span>{costCode.code}</span>
          </div>
        </TableCell>
        <TableCell className="py-1 text-sm pl-4">{costCode.name}</TableCell>
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
          {isLeafSubcategory ? (
            <span className="text-muted-foreground text-sm">-</span>
          ) : (
            <CostCodeInlineEditor
              costCode={costCode}
              field="has_specifications"
              onUpdate={onUpdate}
            />
          )}
        </TableCell>
        <TableCell className="py-1">
          {isLeafSubcategory ? (
            <span className="text-muted-foreground text-sm">-</span>
          ) : (
            <CostCodeInlineEditor
              costCode={costCode}
              field="has_bidding"
              onUpdate={onUpdate}
            />
          )}
        </TableCell>
        <TableCell className="py-1">
          {isLeafSubcategory ? (
            <span className="text-muted-foreground text-sm">-</span>
          ) : (
            <CostCodeInlineEditor
              costCode={costCode}
              field="has_subcategories"
              onUpdate={onUpdate}
            />
          )}
        </TableCell>
        <TableCell className="py-1">
          <CostCodeInlineEditor
            costCode={costCode}
            field="estimate"
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
      {isExpandable && expanded && (
        <>
          {childrenToRender.map((childCode) => (
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
              onToggleExpand={onToggleExpand}
              onAddSubcategory={onAddSubcategory}
              isCodeExpanded={isCodeExpanded}
              allCostCodes={allCostCodes}
            />
          ))}
          
          {/* Add Subcategory Button Row */}
          {onAddSubcategory && costCode.has_subcategories && (
            <TableRow className="h-8 bg-muted/30">
              <TableCell className="py-1"></TableCell>
              <TableCell colSpan={10} className="py-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSubcategoryDialog(true)}
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
      
      {/* Subcategory Dialog */}
      <AddSubcategoryDialog
        parentCode={costCode.code}
        parentName={costCode.name}
        existingCostCodes={allCostCodes}
        onAddCostCode={handleAddSubcategory}
        open={showSubcategoryDialog}
        onOpenChange={setShowSubcategoryDialog}
      />
    </>
  );
}
