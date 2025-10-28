
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
  onEditGroup: (group: string) => void;
  onDeleteGroup: (group: string) => void;
  isDeleting?: boolean;
  groupTotal: number;
  visibleColumns?: { historicalCosts: boolean; variance: boolean };
}

export function BudgetGroupHeader({ 
  group, 
  isExpanded, 
  onToggle, 
  isSelected, 
  isPartiallySelected, 
  onCheckboxChange,
  onDeleteGroup,
  isDeleting = false,
  groupTotal,
  visibleColumns = { historicalCosts: true, variance: true }
}: BudgetGroupHeaderProps) {
  const checkboxRef = React.useRef<HTMLButtonElement>(null);
  const formatCurrency = (amount: number) => {
    return `$${Math.round(amount).toLocaleString()}`;
  };

  React.useEffect(() => {
    if (checkboxRef.current && 'indeterminate' in checkboxRef.current) {
      (checkboxRef.current as any).indeterminate = isPartiallySelected && !isSelected;
    }
  }, [isPartiallySelected, isSelected]);

  return (
    <TableRow className="bg-muted/40 hover:bg-muted/60 sticky top-0 z-20 border-b">
      <TableCell className="py-3 px-3">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={isSelected}
            ref={checkboxRef}
            onCheckedChange={(checked) => onCheckboxChange(group, checked as boolean)}
          />
          <button
            type="button"
            aria-label={isExpanded ? 'Collapse group' : 'Expand group'}
            onClick={() => onToggle(group)}
            className="p-0.5 rounded hover:bg-muted"
          >
            <ChevronDown 
              className={`h-4 w-4 transition-transform ${
                isExpanded ? 'rotate-0' : '-rotate-90'
              }`} 
            />
          </button>
        </div>
      </TableCell>
      <TableCell 
        className="w-40 font-bold text-sm py-3 pl-12"
      >
        {group}
      </TableCell>
      <TableCell className="flex-1 min-w-[250px] py-3 px-3"></TableCell>
      <TableCell className="w-48 py-1"></TableCell>
      <TableCell className="w-52 py-1 text-sm text-right font-semibold">
        {formatCurrency(groupTotal)}
      </TableCell>
      {visibleColumns.historicalCosts && <TableCell className="w-52 py-1"></TableCell>}
      {visibleColumns.variance && <TableCell className="w-48 py-1"></TableCell>}
    </TableRow>
  );
}
