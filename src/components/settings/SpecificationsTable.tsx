import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { SpecificationTableRow } from './SpecificationTableRow';
import { SpecificationGroupRow } from './SpecificationGroupRow';
import type { Tables } from '@/integrations/supabase/types';

type CostCode = Tables<'cost_codes'>;

interface SpecificationsTableProps {
  specifications: CostCode[];
  loading: boolean;
  selectedSpecifications: Set<string>;
  collapsedGroups: Set<string>;
  groupedSpecifications: Record<string, CostCode[]>;
  parentCodes: Set<string>;
  onSpecificationSelect: (specId: string, checked: boolean) => void;
  onSelectAllSpecifications: (checked: boolean) => void;
  onToggleGroupCollapse: (groupKey: string) => void;
  onUpdateSpecification: (specId: string, updatedSpec: any) => void;
  onEditSpecification: (spec: CostCode) => void;
  onDeleteSpecification: (spec: CostCode) => void;
  getParentCostCode: (parentGroupCode: string) => CostCode | undefined;
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
  onEditSpecification,
  onDeleteSpecification,
  getParentCostCode
}: SpecificationsTableProps) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="h-10">
            <TableHead className="font-bold py-2 text-sm w-12">
              <Checkbox
                checked={selectedSpecifications.size === specifications.length && specifications.length > 0}
                onCheckedChange={onSelectAllSpecifications}
                ref={(el) => {
                  if (el && 'indeterminate' in el) {
                    (el as any).indeterminate = selectedSpecifications.size > 0 && selectedSpecifications.size < specifications.length;
                  }
                }}
              />
            </TableHead>
            <TableHead className="font-bold py-2 text-sm">Code</TableHead>
            <TableHead className="font-bold py-2 text-sm">Name</TableHead>
            <TableHead className="font-bold py-2 text-sm">Category</TableHead>
            <TableHead className="font-bold py-2 text-sm">Unit of Measure</TableHead>
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
              <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                No cost codes with specifications found. Enable specifications on cost codes to see them here.
              </TableCell>
            </TableRow>
          ) : (
            // Sort groups to show ungrouped first, then alphabetically
            Object.entries(groupedSpecifications)
              .sort(([a], [b]) => {
                if (a === 'ungrouped') return -1;
                if (b === 'ungrouped') return 1;
                return a.localeCompare(b);
              })
              .map(([groupKey, groupSpecifications]) => (
                <React.Fragment key={`group-${groupKey}`}>
                  {groupKey !== 'ungrouped' && (
                    <SpecificationGroupRow
                      groupKey={groupKey}
                      parentCostCode={getParentCostCode(groupKey)}
                      isCollapsed={collapsedGroups.has(groupKey)}
                      isSelected={getParentCostCode(groupKey) ? selectedSpecifications.has(getParentCostCode(groupKey)!.id) : false}
                      onToggleCollapse={onToggleGroupCollapse}
                      onSelect={onSpecificationSelect}
                      onEdit={onEditSpecification}
                      onDelete={onDeleteSpecification}
                      onUpdate={onUpdateSpecification}
                    />
                  )}
                  {/* Show child specifications when group is expanded or ungrouped */}
                  {(groupKey === 'ungrouped' || !collapsedGroups.has(groupKey)) && 
                    groupSpecifications
                      .filter(spec => {
                        // Only show child codes (not the parent code itself in the child list)
                        return !parentCodes.has(spec.code);
                      })
                      .map((spec) => (
                        <SpecificationTableRow
                          key={`row-${spec.id}`}
                          specification={spec}
                          isSelected={selectedSpecifications.has(spec.id)}
                          onSelect={onSpecificationSelect}
                          onEdit={onEditSpecification}
                          onDelete={onDeleteSpecification}
                          onUpdate={onUpdateSpecification}
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
  );
}