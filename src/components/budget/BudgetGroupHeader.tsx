
import React from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { ChevronDown, Edit, Trash2 } from 'lucide-react';
import { DeleteButton } from '@/components/ui/delete-button';

interface BudgetGroupHeaderProps {
  group: string;
  isExpanded: boolean;
  onToggle: (group: string) => void;
  isSelected: boolean;
  isPartiallySelected: boolean;
  onCheckboxChange: (group: string, checked: boolean) => void;
  onEditGroup: (group: string) => void;
  onDeleteGroup: (group: string) => void;
  isDeleting?: boolean;
}

export function BudgetGroupHeader({ 
  group, 
  isExpanded, 
  onToggle, 
  isSelected, 
  isPartiallySelected, 
  onCheckboxChange,
  onEditGroup,
  onDeleteGroup,
  isDeleting = false
}: BudgetGroupHeaderProps) {
  return (
    <TableRow className="bg-gray-50">
      <TableCell className="w-12">
        <Checkbox
          checked={isSelected}
          ref={(el) => {
            if (el && 'indeterminate' in el) {
              (el as any).indeterminate = isPartiallySelected && !isSelected;
            }
          }}
          onCheckedChange={(checked) => onCheckboxChange(group, checked as boolean)}
        />
      </TableCell>
      <TableCell 
        colSpan={6} 
        className="font-medium cursor-pointer hover:bg-gray-100"
        onClick={() => onToggle(group)}
      >
        <div className="flex items-center">
          <ChevronDown 
            className={`h-4 w-4 mr-2 transition-transform ${
              isExpanded ? 'rotate-0' : '-rotate-90'
            }`} 
          />
          {group}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              onEditGroup(group);
            }}
            disabled={isDeleting}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <DeleteButton
            onDelete={() => onDeleteGroup(group)}
            title="Delete Group"
            description={`Are you sure you want to delete all budget items in the "${group}" group? This action cannot be undone.`}
            size="sm"
            variant="ghost"
            isLoading={isDeleting}
            showIcon={true}
          />
        </div>
      </TableCell>
    </TableRow>
  );
}
