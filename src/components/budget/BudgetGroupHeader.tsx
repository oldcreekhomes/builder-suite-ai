
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
  stickyTop?: number;
  rowClassName?: string;
  floatingClassName?: string;
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
  visibleColumns = { historicalCosts: true, variance: true },
  stickyTop,
  rowClassName = '',
  floatingClassName = ''
}: BudgetGroupHeaderProps) {
  const formatCurrency = (amount: number) => `$${Math.round(amount).toLocaleString()}`;

  const baseClassName = stickyTop !== undefined 
    ? `bg-background hover:bg-muted/60 border-b ${floatingClassName} ${rowClassName}`.trim()
    : `bg-muted/40 hover:bg-muted/60 border-b ${rowClassName}`.trim();

  const style = stickyTop !== undefined 
    ? { position: 'sticky' as const, top: stickyTop, zIndex: 10 }
    : undefined;

  return (
    <TableRow className={baseClassName} style={style}>
      <TableCell className="py-3 px-3">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={isSelected ? true : isPartiallySelected ? 'indeterminate' : false}
            onCheckedChange={(checked) => onCheckboxChange(group, checked === true)}
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
      <TableCell className="w-[320px] py-3 px-3"></TableCell>
      <TableCell className="w-48 py-1"></TableCell>
      <TableCell className="w-52 pr-0 py-1"></TableCell>
      <TableCell className="w-12 px-0 py-1"></TableCell>
      {visibleColumns.historicalCosts && <TableCell className="w-52 pl-0 py-1"></TableCell>}
      {visibleColumns.variance && <TableCell className="w-48 py-1"></TableCell>}
    </TableRow>
  );
}
