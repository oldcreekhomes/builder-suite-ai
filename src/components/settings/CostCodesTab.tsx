
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { AddCostCodeDialog } from '@/components/AddCostCodeDialog';
import { ExcelImportDialog } from '@/components/ExcelImportDialog';
import { CostCodeTableRow } from './CostCodeTableRow';
import { CostCodeGroupRow } from './CostCodeGroupRow';
import { BulkActionBar } from './BulkActionBar';
import type { Tables } from '@/integrations/supabase/types';

type CostCode = Tables<'cost_codes'>;

interface CostCodesTabProps {
  costCodes: CostCode[];
  loading: boolean;
  selectedCostCodes: Set<string>;
  collapsedGroups: Set<string>;
  onCostCodeSelect: (costCodeId: string, checked: boolean) => void;
  onSelectAllCostCodes: (checked: boolean) => void;
  onToggleGroupCollapse: (groupKey: string) => void;
  onAddCostCode: (newCostCode: any) => void;
  onUpdateCostCode: (costCodeId: string, updatedCostCode: any) => void;
  onEditCostCode: (costCode: CostCode) => void;
  onDeleteCostCode: (costCode: CostCode) => void;
  onImportCostCodes: (importedCostCodes: any[]) => void;
  onBulkDeleteCostCodes: () => void;
}

export function CostCodesTab({
  costCodes,
  loading,
  selectedCostCodes,
  collapsedGroups,
  onCostCodeSelect,
  onSelectAllCostCodes,
  onToggleGroupCollapse,
  onAddCostCode,
  onUpdateCostCode,
  onEditCostCode,
  onDeleteCostCode,
  onImportCostCodes,
  onBulkDeleteCostCodes
}: CostCodesTabProps) {
  // Get all parent codes that have children - use a more stable approach
  const parentCodesWithChildren = React.useMemo(() => {
    const parents = new Set<string>();
    costCodes.forEach(cc => {
      if (cc.parent_group) {
        parents.add(cc.parent_group);
      }
    });
    return parents;
  }, [costCodes]);

  // Group cost codes by parent group - improved logic to maintain stability
  const groupedCostCodes = React.useMemo(() => {
    const groups: Record<string, CostCode[]> = {};
    
    costCodes.forEach(costCode => {
      const parentGroup = costCode.parent_group;
      
      // If this cost code has a parent group, add it to that group
      if (parentGroup) {
        if (!groups[parentGroup]) {
          groups[parentGroup] = [];
        }
        groups[parentGroup].push(costCode);
      } else {
        // If no parent group, add to ungrouped
        if (!groups['ungrouped']) {
          groups['ungrouped'] = [];
        }
        groups['ungrouped'].push(costCode);
      }
    });
    
    return groups;
  }, [costCodes]);

  // Get parent cost code details for group headers
  const getParentCostCode = React.useCallback((parentGroupCode: string) => {
    return costCodes.find(cc => cc.code === parentGroupCode);
  }, [costCodes]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-black">Cost Codes</h3>
          {selectedCostCodes.size > 0 && (
            <p className="text-sm text-gray-600">
              {selectedCostCodes.size} item{selectedCostCodes.size !== 1 ? 's' : ''} selected
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <BulkActionBar
            selectedCount={selectedCostCodes.size}
            onBulkDelete={onBulkDeleteCostCodes}
            label="cost codes"
          />
          <ExcelImportDialog onImportCostCodes={onImportCostCodes} />
          <AddCostCodeDialog 
            existingCostCodes={costCodes.map(cc => ({ code: cc.code, name: cc.name }))}
            onAddCostCode={onAddCostCode}
          />
        </div>
      </div>
      
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
              Object.entries(groupedCostCodes).map(([groupKey, groupCostCodes]) => (
                <React.Fragment key={groupKey}>
                  {groupKey !== 'ungrouped' && (
                    <CostCodeGroupRow
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
                  )}
                  {(groupKey === 'ungrouped' || !collapsedGroups.has(groupKey)) && 
                    groupCostCodes
                      .filter(costCode => {
                        // Don't show parent codes as individual rows if they have children
                        return !parentCodesWithChildren.has(costCode.code);
                      })
                      .map((costCode) => (
                        <CostCodeTableRow
                          key={costCode.id}
                          costCode={costCode}
                          isSelected={selectedCostCodes.has(costCode.id)}
                          onSelect={onCostCodeSelect}
                          onEdit={onEditCostCode}
                          onDelete={onDeleteCostCode}
                          onUpdate={onUpdateCostCode}
                          isGrouped={groupKey !== 'ungrouped'}
                        />
                      ))
                  }
                </React.Fragment>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
