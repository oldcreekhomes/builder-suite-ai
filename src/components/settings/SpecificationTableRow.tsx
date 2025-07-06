import React from 'react';
import { TableRow, TableCell } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Trash2, Paperclip } from 'lucide-react';
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
  onDeleteAllFiles: (specId: string) => void;
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
  onDeleteAllFiles
}: SpecificationTableRowProps) {
  return (
    <TableRow className="h-8">
      <TableCell className="py-1">
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => onSelect(specification.id, checked as boolean)}
        />
      </TableCell>
      <TableCell className={`py-1 text-sm text-left ${isGrouped ? 'pl-8' : ''}`}>
        {specification.cost_code.code}
      </TableCell>
      <TableCell className="py-1 text-sm">
        {specification.cost_code.name}
      </TableCell>
      <TableCell className="py-1 text-sm">
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
      <TableCell className="py-1">
        <SpecificationFilesCell
          files={specification.files ? (Array.isArray(specification.files) ? specification.files : JSON.parse(specification.files as string)) : null}
          specificationId={specification.id}
          onFileUpload={onFileUpload}
          onDeleteAllFiles={onDeleteAllFiles}
        />
      </TableCell>
      <TableCell className="py-1">
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(specification)}
            className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}