import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { CostCodeTableRow } from './CostCodeTableRow';
import { CostCodeGroupRow } from './CostCodeGroupRow';
import { PriceHistoryModal } from './PriceHistoryModal';
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
  onAddSubcategory: (costCode: any) => void;
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
  onAddCostCode,
  onAddSubcategory
}: CostCodesTableProps) {
  const [priceHistoryModal, setPriceHistoryModal] = useState<{
    open: boolean;
    costCode: CostCode | null;
  }>({ open: false, costCode: null });

  const handleViewPriceHistory = (costCode: CostCode) => {
    setPriceHistoryModal({ open: true, costCode });
  };

  return (
    <>
      {priceHistoryModal.costCode && (
        <PriceHistoryModal
          costCode={priceHistoryModal.costCode}
          open={priceHistoryModal.open}
          onOpenChange={(open) => setPriceHistoryModal({ open, costCode: null })}
        />
      )}
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="h-10">
            <TableHead className="font-bold py-2 text-sm w-12">
              <Checkbox
                checked={
                  selectedCostCodes.size === costCodes.length && costCodes.length > 0
                    ? true
                    : selectedCostCodes.size === 0
                    ? false
                    : "indeterminate"
                }
                onCheckedChange={(checked) => onSelectAllCostCodes(!!checked)}
                aria-label="Select all cost codes"
              />
            </TableHead>
            <TableHead className="font-bold py-2 text-sm text-right">Code</TableHead>
            <TableHead className="font-bold py-2 text-sm">Description</TableHead>
            <TableHead className="font-bold py-2 text-sm">Quantity</TableHead>
            <TableHead className="font-bold py-2 text-sm">Price</TableHead>
            <TableHead className="font-bold py-2 text-sm">Unit</TableHead>
            <TableHead className="font-bold py-2 text-sm">Specifications</TableHead>
            <TableHead className="font-bold py-2 text-sm">Bidding</TableHead>
            <TableHead className="font-bold py-2 text-sm">Sub Categories</TableHead>
            <TableHead className="font-bold py-2 text-sm">Estimate</TableHead>
            <TableHead className="font-bold py-2 text-sm">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={11} className="text-center py-8">
                Loading cost codes...
              </TableCell>
            </TableRow>
          ) : costCodes.length === 0 ? (
            <TableRow>
              <TableCell colSpan={11} className="text-center py-8 text-gray-500">
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
                    // Always get children from the full costCodes array, not just the group (normalize strings)
                    const parentCode = String(costCode.code ?? '').trim();
                    const children = costCodes
                      .filter(cc => String(cc.parent_group ?? '').trim() === parentCode)
                      .sort((a, b) => {
                        // Split codes by '.' to compare segments
                        const aParts = a.code.split('.');
                        const bParts = b.code.split('.');
                        
                        // Compare each segment
                        for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
                          const aPart = aParts[i] || '';
                          const bPart = bParts[i] || '';
                          
                          // Try to parse as numbers
                          const aNum = parseFloat(aPart);
                          const bNum = parseFloat(bPart);
                          
                          // If both are valid numbers, compare numerically
                          if (!isNaN(aNum) && !isNaN(bNum)) {
                            if (aNum !== bNum) {
                              return aNum - bNum;
                            }
                          } else {
                            // Otherwise compare as strings
                            const stringCompare = aPart.localeCompare(bPart);
                            if (stringCompare !== 0) {
                              return stringCompare;
                            }
                          }
                        }
                        
                        return 0;
                      });
                    
                    return (
                      <CostCodeTableRow
                        key={`row-${costCode.id}`}
                        costCode={costCode}
                        selectedCostCodes={selectedCostCodes}
                        onSelect={onCostCodeSelect}
                        onEdit={onEditCostCode}
                        onDelete={onDeleteCostCode}
                        onUpdate={onUpdateCostCode}
                        onViewPriceHistory={handleViewPriceHistory}
                        isGrouped={groupKey !== 'ungrouped'}
                        isExpanded={!collapsedGroups.has(costCode.code)}
                        onToggleExpand={onToggleGroupCollapse}
                        childCodes={children}
                        onAddSubcategory={onAddSubcategory}
                        isCodeExpanded={(code) => !collapsedGroups.has(code)}
                        allCostCodes={costCodes}
                      />
                    );
                  });
              })
          )}
        </TableBody>
      </Table>
    </div>
    </>
  );
}