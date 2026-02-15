import React from 'react';
import { TableRow, TableCell } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Paperclip } from 'lucide-react';
import { TableRowActions } from '@/components/ui/table-row-actions';
import { SpecificationFilesCell } from './SpecificationFilesCell';
import type { Tables } from '@/integrations/supabase/types';

type CostCode = Tables<'cost_codes'>;
type CostCodeSpecification = Tables<'cost_code_specifications'>;

// Combined type for specifications with cost code data
type SpecificationWithCostCode = CostCodeSpecification & {
  cost_code: CostCode;
};

interface SpecificationTableRowProps {
  specification: SpecificationWithCostCode;
  isSelected: boolean;
  isGrouped: boolean;
  onSelect: (specId: string, checked: boolean) => void;
  onEditDescription: (spec: SpecificationWithCostCode) => void;
  onDelete: (spec: SpecificationWithCostCode) => void;
  onUpdate: (specId: string, updatedSpec: any) => void;
  onFileUpload: (specId: string) => void;
  onDeleteIndividualFile: (specId: string, fileName: string) => void;
}

export function SpecificationTableRow({
  specification,
  isSelected,
  isGrouped,
  onSelect,
  onEditDescription,
  onDelete,
  onUpdate,
  onFileUpload,
  onDeleteIndividualFile
}: SpecificationTableRowProps) {
  return (
    <TableRow>
      <TableCell>
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => onSelect(specification.id, checked as boolean)}
        />
      </TableCell>
      <TableCell className="text-left">
        {specification.cost_code.code}
      </TableCell>
      <TableCell>
        {specification.cost_code.name}
      </TableCell>
      <TableCell>
        {specification.description ? (
          <button
            onClick={() => onEditDescription(specification)}
            className="flex items-center text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
            title="Click to view/edit description"
          >
            <Paperclip className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={() => onEditDescription(specification)}
            className="text-left hover:text-blue-600 transition-colors cursor-pointer text-gray-500"
          >
            Click to add description
          </button>
        )}
      </TableCell>
      <TableCell>
        <SpecificationFilesCell
          files={specification.files as string[] | null}
          specificationId={specification.id}
          onFileUpload={onFileUpload}
          onDeleteIndividualFile={onDeleteIndividualFile}
        />
      </TableCell>
      <TableCell>
        <TableRowActions actions={[
          { label: "Delete", onClick: () => onDelete(specification), variant: "destructive", requiresConfirmation: true, confirmTitle: "Delete Specification", confirmDescription: `Are you sure you want to delete this specification for "${specification.cost_code.code} - ${specification.cost_code.name}"?` },
        ]} />
      </TableCell>
    </TableRow>
  );
}