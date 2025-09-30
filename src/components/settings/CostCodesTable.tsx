import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { CostCodeTableRow } from './CostCodeTableRow';
import { CostCodeGroupRow } from './CostCodeGroupRow';
import type { Tables } from '@/integrations/supabase/types';

type CostCode = Tables<'cost_codes'>;

interface CostCodesTableProps {
  costCodes: CostCode[];
  loading: boolean;
  selectedCostCodes: Set<string>;
  collapsedGroups: Set<string>;
  groupedCostCodes: Record<string, CostCode[]>;
  parentCodes: Set<string>;
  onCostCodeSelect: (costCodeId: string, checked: boolean) => void;
  onSelectAllCostCodes: (checked: boolean) => void;
  onToggleGroupCollapse: (groupKey: string) => void;
  onUpdateCostCode: (costCodeId: string, updatedCostCode: any) => void;
  onEditCostCode: (costCode: CostCode) => void;
  onDeleteCostCode: (costCode: CostCode) => void;
  getParentCostCode: (parentGroupCode: string) => CostCode | undefined;
  onAddCostCode: (parentCode?: string) => void;
}

export function CostCodesTable({
  costCodes,
  loading,
  selectedCostCodes,
  collapsedGroups,
  groupedCostCodes,
  parentCodes,
  onCostCodeSelect,
  onSelectAllCostCodes,
  onToggleGroupCollapse,
  onUpdateCostCode,
  onEditCostCode,
  onDeleteCostCode,
  getParentCostCode,
  onAddCostCode
}: CostCodesTableProps) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="h-10">
            <TableHead className="font-bold py-2 text-sm w-12">
              <Checkbox
                checked={selectedCostCodes.size === costCodes.length && costCodes.length > 0}
                onCheckedChange={onSelectAllCostCodes}
                ref={(el) => {
                  if (el && 'indeterminate' in el) {
                    (el as any).indeterminate = selectedCostCodes.size > 0 && selectedCostCodes.size < costCodes.length;
                  }
                }}
              />
            </TableHead>
            <TableHead className="font-bold py-2 text-sm">Code</TableHead>
            <TableHead className="font-bold py-2 text-sm">Description</TableHead>
            <TableHead className="font-bold py-2 text-sm">Quantity</TableHead>
            <TableHead className="font-bold py-2 text-sm">Price</TableHead>
            <TableHead className="font-bold py-2 text-sm">Unit</TableHead>
            <TableHead className="font-bold py-2 text-sm">Specifications</TableHead>
            <TableHead className="font-bold py-2 text-sm">Bidding</TableHead>
            <TableHead className="font-bold py-2 text-sm">Sub Categories</TableHead>
            <TableHead className="font-bold py-2 text-sm">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={10} className="text-center py-8">
                Loading cost codes...
              </TableCell>
            </TableRow>
          ) : costCodes.length === 0 ? (
            <TableRow>
              <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                No cost codes found. Add some or import from Excel.
              </TableCell>
            </TableRow>
          ) : (
            // Sort groups to show ungrouped first, then alphabetically
            Object.entries(groupedCostCodes)
              .sort(([a], [b]) => {
                if (a === 'ungrouped') return -1;
                if (b === 'ungrouped') return 1;
                return a.localeCompare(b);
              })
              .flatMap(([groupKey, groupCostCodes]) => {
                // Render top-level cost codes (those without a parent, or those that are the group parent)
                return groupCostCodes
                  .filter(costCode => {
                    // Show codes that have no parent_group OR their code matches the groupKey
                    return !costCode.parent_group || costCode.code === groupKey;
                  })
                  .map((costCode) => {
                    // Get children for this cost code if it has subcategories
                    const children = costCode.has_subcategories 
                      ? groupCostCodes.filter(cc => cc.parent_group === costCode.code)
                      : [];
                    
                    return (
                      <CostCodeTableRow
                        key={`row-${costCode.id}`}
                        costCode={costCode}
                        isSelected={selectedCostCodes.has(costCode.id)}
                        onSelect={onCostCodeSelect}
                        onEdit={onEditCostCode}
                        onDelete={onDeleteCostCode}
                        onUpdate={onUpdateCostCode}
                        isGrouped={groupKey !== 'ungrouped'}
                        isExpanded={!collapsedGroups.has(costCode.code)}
                        onToggleExpand={onToggleGroupCollapse}
                        childCodes={children}
                        onAddSubcategory={onAddCostCode}
                      />
                    );
                  });
              })
          )}
        </TableBody>
      </Table>
    </div>
  );
}