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
  getParentCostCode
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
            <TableHead className="font-bold py-2 text-sm">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center py-8">
                Loading cost codes...
              </TableCell>
            </TableRow>
          ) : costCodes.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center py-8 text-gray-500">
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
                const rows = [];
                
                // Add group header row if not ungrouped
                if (groupKey !== 'ungrouped') {
                  rows.push(
                    <CostCodeGroupRow
                      key={`group-${groupKey}`}
                      groupKey={groupKey}
                      parentCostCode={getParentCostCode(groupKey)}
                      isCollapsed={collapsedGroups.has(groupKey)}
                      isSelected={getParentCostCode(groupKey) ? selectedCostCodes.has(getParentCostCode(groupKey)!.id) : false}
                      onToggleCollapse={onToggleGroupCollapse}
                      onSelect={onCostCodeSelect}
                      onEdit={onEditCostCode}
                      onDelete={onDeleteCostCode}
                      onUpdate={onUpdateCostCode}
                    />
                  );
                }
                
                // Add child cost codes when group is expanded or ungrouped
                if (groupKey === 'ungrouped' || !collapsedGroups.has(groupKey)) {
                  const childRows = groupCostCodes
                    .filter(costCode => {
                      // Only show child codes (not the parent code itself in the child list)
                      return !parentCodes.has(costCode.code);
                    })
                    .map((costCode) => (
                      <CostCodeTableRow
                        key={`row-${costCode.id}`}
                        costCode={costCode}
                        isSelected={selectedCostCodes.has(costCode.id)}
                        onSelect={onCostCodeSelect}
                        onEdit={onEditCostCode}
                        onDelete={onDeleteCostCode}
                        onUpdate={onUpdateCostCode}
                        isGrouped={groupKey !== 'ungrouped'}
                      />
                    ));
                  rows.push(...childRows);
                }
                
                return rows;
              })
          )}
        </TableBody>
      </Table>
    </div>
  );
}