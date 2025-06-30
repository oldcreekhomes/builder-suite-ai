
import React from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronDown } from 'lucide-react';

interface BudgetGroupHeaderProps {
  group: string;
  isExpanded: boolean;
  onToggle: (group: string) => void;
  isSelected: boolean;
  isPartiallySelected: boolean;
  onCheckboxChange: (group: string, checked: boolean) => void;
}

export function BudgetGroupHeader({ 
  group, 
  isExpanded, 
  onToggle, 
  isSelected, 
  isPartiallySelected, 
  onCheckboxChange 
}: BudgetGroupHeaderProps) {
  return (
    <TableRow className="bg-gray-50">
      <TableCell className="w-12">
        <Checkbox
          checked={isSelected}
          ref={(el) => {
            if (el) {
              el.indeterminate = isPartiallySelected && !isSelected;
            }
          }}
          onCheckedChange={(checked) => onCheckboxChange(group, checked as boolean)}
        />
      </TableCell>
      <TableCell 
        colSpan={7} 
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
    </TableRow>
  );
}
