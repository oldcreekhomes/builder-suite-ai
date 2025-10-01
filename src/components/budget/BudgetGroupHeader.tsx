
import React from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronDown } from 'lucide-react';
import { DeleteButton } from '@/components/ui/delete-button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useHistoricalProjects } from '@/hooks/useHistoricalProjects';
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
  selectedHistoricalProject: string;
  onHistoricalProjectChange: (projectId: string) => void;
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
  selectedHistoricalProject,
  onHistoricalProjectChange,
  visibleColumns
}: BudgetGroupHeaderProps) {
  const { data: historicalProjects = [] } = useHistoricalProjects();
  const formatCurrency = (amount: number) => {
    return `$${Math.round(amount).toLocaleString()}`;
  };

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
        colSpan={5} 
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
      <TableCell className="px-3 py-0 w-32">
        {/* Total moved to group total row */}
      </TableCell>
      <TableCell className="px-3 py-0 w-48">
        <div className={`${visibleColumns.historicalCosts ? '' : 'opacity-0 select-none pointer-events-none'} ${group.startsWith('1000') ? 'flex items-center -ml-3' : ''}`}>
          {group.startsWith('1000') && historicalProjects.length > 0 && (
            <Select value={selectedHistoricalProject} onValueChange={onHistoricalProjectChange}>
              <SelectTrigger className="h-6 text-xs border-0 shadow-none bg-transparent hover:bg-gray-100 w-auto justify-start p-0 pl-1">
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent className="bg-background border shadow-lg z-50">
                {historicalProjects.map((project) => (
                  <SelectItem key={project.id} value={project.id} className="text-xs">
                    {project.address}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </TableCell>
      <TableCell className="px-3 py-0 w-32">
        {/* Empty cell for Variance column in group header */}
      </TableCell>
      <TableCell className="px-1 py-0 w-20 sticky right-0 bg-gray-50 z-20">
        <div className="flex justify-center">
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
        </div>
      </TableCell>
    </TableRow>
  );
}
