import React from 'react';
import { TableRow, TableCell } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { TableRowActions } from '@/components/ui/table-row-actions';
import type { Tables } from '@/integrations/supabase/types';

type CostCode = Tables<'cost_codes'>;
type CostCodeSpecification = Tables<'cost_code_specifications'>;

// Combined type for specifications with cost code data
type SpecificationWithCostCode = CostCodeSpecification & {
  cost_code: CostCode;
};

interface SpecificationGroupRowProps {
  groupKey: string;
  parentCostCode?: SpecificationWithCostCode;
  isCollapsed: boolean;
  isSelected: boolean;
  onToggleCollapse: (groupKey: string) => void;
  onSelect: (specId: string, checked: boolean) => void;
  onEditDescription: (spec: SpecificationWithCostCode) => void;
  onDelete: (spec: SpecificationWithCostCode) => void;
  onUpdate: (specId: string, updatedSpec: any) => void;
  onFileUpload: (specId: string) => void;
  onDeleteIndividualFile: (specId: string, fileName: string) => void;
}

export function SpecificationGroupRow({
  groupKey,
  parentCostCode,
  isCollapsed,
  isSelected,
  onToggleCollapse,
  onSelect,
  onEditDescription,
  onDelete,
  onUpdate,
  onFileUpload,
  onDeleteIndividualFile
}: SpecificationGroupRowProps) {
  return (
    <TableRow className="bg-muted/30 border-b-2 font-medium">
      <TableCell className="pl-4">
        <button
          onClick={() => onToggleCollapse(groupKey)}
          className="hover:bg-gray-100 rounded p-1 -ml-1"
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>
      </TableCell>
      <TableCell className="text-left">
        <span className="font-semibold">
          {parentCostCode ? parentCostCode.cost_code.code : groupKey}
        </span>
      </TableCell>
      <TableCell className="font-semibold">
        {parentCostCode ? parentCostCode.cost_code.name : groupKey}
      </TableCell>
      <TableCell>
        {/* Empty description cell */}
      </TableCell>
      <TableCell>
        {/* Empty files cell */}
      </TableCell>
      <TableCell>
        {parentCostCode && (
          <TableRowActions actions={[
            { label: "Delete Group", onClick: () => onDelete(parentCostCode), variant: "destructive", requiresConfirmation: true, confirmTitle: "Delete Group", confirmDescription: `Are you sure you want to delete this specification group?` },
          ]} />
        )}
      </TableCell>
    </TableRow>
  );
}