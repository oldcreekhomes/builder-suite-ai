import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { SpecificationTableRow } from './SpecificationTableRow';
import { SpecificationGroupRow } from './SpecificationGroupRow';
import type { Tables } from '@/integrations/supabase/types';

type CostCode = Tables<'cost_codes'>;
type CostCodeSpecification = Tables<'cost_code_specifications'>;

// Combined type for specifications with cost code data
type SpecificationWithCostCode = CostCodeSpecification & {
  cost_code: CostCode;
};

interface SpecificationsTableProps {
  specifications: SpecificationWithCostCode[];
  loading: boolean;
  selectedSpecifications: Set<string>;
  collapsedGroups: Set<string>;
  groupedSpecifications: Record<string, SpecificationWithCostCode[]>;
  parentCodes: Set<string>;
  onSpecificationSelect: (specId: string, checked: boolean) => void;
  onSelectAllSpecifications: (checked: boolean) => void;
  onToggleGroupCollapse: (groupKey: string) => void;
  onUpdateSpecification: (specId: string, updatedSpec: any) => void;
  onEditDescription: (spec: SpecificationWithCostCode) => void;
  onDeleteSpecification: (spec: SpecificationWithCostCode) => void;
  onFileUpload: (specId: string) => void;
  onDeleteAllFiles: (specId: string) => void;
  getParentCostCode: (parentGroupCode: string) => SpecificationWithCostCode | undefined;
}

export function SpecificationsTable({
  specifications,
  loading,
  selectedSpecifications,
  collapsedGroups,
  groupedSpecifications,
  parentCodes,
  onSpecificationSelect,
  onSelectAllSpecifications,
  onToggleGroupCollapse,
  onUpdateSpecification,
  onEditDescription,
  onDeleteSpecification,
  onFileUpload,
  onDeleteAllFiles,
  getParentCostCode
}: SpecificationsTableProps) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="h-10">
            <TableHead className="font-bold py-2 text-sm w-12">
            </TableHead>
            <TableHead className="font-bold py-2 text-sm">Code</TableHead>
            <TableHead className="font-bold py-2 text-sm">Name</TableHead>
            <TableHead className="font-bold py-2 text-sm">Description</TableHead>
            <TableHead className="font-bold py-2 text-sm">Files</TableHead>
            <TableHead className="font-bold py-2 text-sm">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8">
                Loading specifications...
              </TableCell>
            </TableRow>
          ) : specifications.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                No cost codes with specifications found. Enable specifications on cost codes to see them here.
              </TableCell>
            </TableRow>
          ) : (
            // Sort groups to show ungrouped first, then alphabetically
            // Show groups that have any specifications (parent OR child)
            Object.entries(groupedSpecifications)
              .filter(([groupKey, groupSpecifications]) => {
                if (groupKey === 'ungrouped') return true;
                
                // Show the group if it has any specs (parent or child)
                return groupSpecifications.length > 0;
              })
              .sort(([a], [b]) => {
                if (a === 'ungrouped') return -1;
                if (b === 'ungrouped') return 1;
                return a.localeCompare(b);
              })
              .map(([groupKey, groupSpecifications]) => {
                return (
                  <React.Fragment key={`group-${groupKey}`}>
                  {groupKey !== 'ungrouped' && (
                    <SpecificationGroupRow
                      groupKey={groupKey}
                      parentCostCode={getParentCostCode(groupKey)}
                      isCollapsed={collapsedGroups.has(groupKey)}
                      isSelected={getParentCostCode(groupKey) ? selectedSpecifications.has(getParentCostCode(groupKey)!.id) : false}
                      onToggleCollapse={onToggleGroupCollapse}
                      onSelect={onSpecificationSelect}
                      onEditDescription={onEditDescription}
                      onDelete={onDeleteSpecification}
                      onUpdate={onUpdateSpecification}
                      onFileUpload={onFileUpload}
                      onDeleteAllFiles={onDeleteAllFiles}
                    />
                  )}
                  {/* Show specifications when group is expanded or ungrouped */}
                  {(groupKey === 'ungrouped' || !collapsedGroups.has(groupKey)) && 
                    groupSpecifications
                      .sort((a, b) => {
                        // Show parent codes first, then children by code
                        const aIsParent = parentCodes.has(a.cost_code.code);
                        const bIsParent = parentCodes.has(b.cost_code.code);
                        if (aIsParent !== bIsParent) return aIsParent ? -1 : 1;
                        return a.cost_code.code.localeCompare(b.cost_code.code);
                      })
                      .map((spec) => (
                        <SpecificationTableRow
                          key={`row-${spec.id}`}
                          specification={spec}
                          isSelected={selectedSpecifications.has(spec.id)}
                          onSelect={onSpecificationSelect}
                          onEditDescription={onEditDescription}
                          onDelete={onDeleteSpecification}
                          onUpdate={onUpdateSpecification}
                          onFileUpload={onFileUpload}
                          onDeleteAllFiles={onDeleteAllFiles}
                          isGrouped={groupKey !== 'ungrouped'}
                        />
                      ))
                  }
                  </React.Fragment>
                );
              })
          )}
        </TableBody>
      </Table>
    </div>
  );
}