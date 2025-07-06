
import React from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronDown } from 'lucide-react';
import { DeleteButton } from '@/components/ui/delete-button';

interface BiddingGroupHeaderProps {
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

export function BiddingGroupHeader({ 
  group, 
  isExpanded, 
  onToggle, 
  isSelected, 
  isPartiallySelected, 
  onCheckboxChange,
  onDeleteGroup,
  isDeleting = false
}: BiddingGroupHeaderProps) {
  return (
    <TableRow className="bg-gray-50 h-10">
      <TableCell className="w-12 py-1">
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
        className="font-medium cursor-pointer hover:bg-gray-100 py-1 text-sm"
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
      <TableCell className="py-1">
        <div className="flex items-center justify-end space-x-2">
          <DeleteButton
            onDelete={() => onDeleteGroup(group)}
            title="Delete Group"
            description={`Are you sure you want to delete all bidding items in the "${group}" group? This action cannot be undone.`}
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
