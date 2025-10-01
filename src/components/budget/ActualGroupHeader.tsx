import React from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface ActualGroupHeaderProps {
  group: string;
  isExpanded: boolean;
  onToggle: (group: string) => void;
  isSelected: boolean;
  isPartiallySelected: boolean;
  onCheckboxChange: (group: string, checked: boolean) => void;
  groupBudgetTotal: number;
  groupCommittedTotal: number;
}

export function ActualGroupHeader({
  group,
  isExpanded,
  onToggle,
  isSelected,
  isPartiallySelected,
  onCheckboxChange,
  groupBudgetTotal,
  groupCommittedTotal
}: ActualGroupHeaderProps) {

  const formatCurrency = (amount: number) => {
    return `$${Math.round(amount).toLocaleString()}`;
  };

  const calculateVariance = (budget: number, committed: number) => {
    return budget - committed; // Budget - Committed Costs
  };

  const getVarianceColor = (variance: number) => {
    if (variance < 0) return 'text-red-600'; // Over budget (negative)
    if (variance > 0) return 'text-green-600'; // Under budget (positive)
    return 'text-gray-600'; // On budget
  };

  const variance = calculateVariance(groupBudgetTotal, groupCommittedTotal);

  return (
    <TableRow className="bg-gray-50 h-8">
      <TableCell className="px-1 py-0 w-12">
        <Checkbox
          checked={isSelected}
          ref={(el) => {
            if (el && 'indeterminate' in el) {
              (el as any).indeterminate = isPartiallySelected && !isSelected;
            }
          }}
          onCheckedChange={(checked) => onCheckboxChange(group, checked as boolean)}
          className="h-3 w-3"
        />
      </TableCell>
      <TableCell 
        colSpan={2} 
        className="px-1 py-0 cursor-pointer hover:bg-gray-100"
        onClick={() => onToggle(group)}
      >
        <div className="flex items-center text-xs font-medium">
          <ChevronDown 
            className={`h-3 w-3 mr-2 transition-transform ${
              isExpanded ? 'rotate-0' : '-rotate-90'
            }`} 
          />
          {group}
        </div>
      </TableCell>
      <TableCell className="px-1 py-0 w-32">
        <div className="text-xs font-medium">
          {formatCurrency(groupBudgetTotal)}
        </div>
      </TableCell>
      <TableCell className="px-1 py-0 w-32">
        <div className="text-xs font-medium">
          {formatCurrency(groupCommittedTotal)}
        </div>
      </TableCell>
      <TableCell className="px-1 py-0 w-32">
        <div className={`text-xs font-medium ${getVarianceColor(variance)}`}>
          {formatCurrency(variance)}
        </div>
      </TableCell>
    </TableRow>
  );
}