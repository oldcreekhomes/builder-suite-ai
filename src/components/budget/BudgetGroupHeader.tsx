
import React from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { ChevronDown } from 'lucide-react';

interface BudgetGroupHeaderProps {
  group: string;
  isExpanded: boolean;
  onToggle: (group: string) => void;
}

export function BudgetGroupHeader({ group, isExpanded, onToggle }: BudgetGroupHeaderProps) {
  return (
    <TableRow className="bg-gray-50">
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
