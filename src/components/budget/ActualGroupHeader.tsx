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
  groupActualTotal: number;
}

export function ActualGroupHeader({
  group,
  isExpanded,
  onToggle,
  isSelected,
  isPartiallySelected,
  onCheckboxChange,
  groupBudgetTotal,
  groupActualTotal
}: ActualGroupHeaderProps) {

  const formatCurrency = (amount: number) => {
    return `$${Math.round(amount).toLocaleString()}`;
  };

  const calculateVariance = (budget: number, actual: number) => {
    return actual - budget;
  };

  const getVarianceColor = (variance: number) => {
    if (variance > 0) return 'text-red-600'; // Over budget
    if (variance < 0) return 'text-green-600'; // Under budget
    return 'text-gray-600'; // On budget
  };

  const variance = calculateVariance(groupBudgetTotal, groupActualTotal);

  return (
    <TableRow className="bg-gray-100/50 hover:bg-gray-100/80 border-t-2 border-gray-200 h-10">
      <TableCell className="h-10 px-1 py-0 w-12">
        <Checkbox
          checked={isSelected || isPartiallySelected}
          onCheckedChange={(checked) => onCheckboxChange(group, checked as boolean)}
          className="h-4 w-4"
          data-state={isPartiallySelected ? "indeterminate" : undefined}
        />
      </TableCell>
      <TableCell 
        className="h-10 px-1 py-0 font-semibold text-sm cursor-pointer select-none"
        onClick={() => onToggle(group)}
        colSpan={2}
      >
        <div className="flex items-center gap-1">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          <span>{group}</span>
        </div>
      </TableCell>
      <TableCell className="h-10 px-1 py-0 font-semibold text-sm text-right">
        {formatCurrency(groupBudgetTotal)}
      </TableCell>
      <TableCell className="h-10 px-1 py-0 font-semibold text-sm text-right">
        {formatCurrency(groupActualTotal)}
      </TableCell>
      <TableCell className={`h-10 px-1 py-0 font-semibold text-sm text-right ${getVarianceColor(variance)}`}>
        {formatCurrency(variance)}
      </TableCell>
    </TableRow>
  );
}