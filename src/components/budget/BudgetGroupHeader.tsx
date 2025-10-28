
import React from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronDown } from 'lucide-react';
import { DeleteButton } from '@/components/ui/delete-button';
import { VisibleColumns } from './BudgetColumnVisibilityDropdown';

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
  visibleColumns: VisibleColumns;
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
  visibleColumns
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
        <Checkbox
          checked={isSelected}
          ref={checkboxRef}
          onCheckedChange={(checked) => onCheckboxChange(group, checked as boolean)}
        />
      </TableCell>
      <TableCell 
        colSpan={2 + (visibleColumns.cost ? 1 : 0) + (visibleColumns.unit ? 1 : 0) + (visibleColumns.quantity ? 1 : 0)} 
        className="font-bold text-sm py-3 px-3 cursor-pointer" 
        onClick={() => onToggle(group)}
      >
        <div className="flex items-center gap-2">
          <ChevronDown 
            className={`h-4 w-4 transition-transform ${
              isExpanded ? 'rotate-0' : '-rotate-90'
            }`} 
          />
          {group}
        </div>
      </TableCell>
      <TableCell className="bg-muted/40" />
      {visibleColumns.historicalCosts && <TableCell className="bg-muted/40" />}
      {visibleColumns.variance && <TableCell className="bg-muted/40" />}
      <TableCell className="sticky right-0 bg-muted/40 z-20 py-3 px-3">
        {isSelected && (
          <DeleteButton
            onDelete={() => onDeleteGroup(group)}
            title="Delete Group"
            description={`Are you sure you want to delete all budget items in the "${group}" group? This action cannot be undone.`}
            size="sm"
            variant="ghost"
            isLoading={isDeleting}
            showIcon={true}
          />
        )}
      </TableCell>
    </TableRow>
  );
}
