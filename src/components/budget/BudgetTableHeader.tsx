
import React from 'react';
import { TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { VisibleColumns } from './BudgetColumnVisibilityDropdown';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { useHistoricalProjects } from '@/hooks/useHistoricalProjects';

interface BudgetTableHeaderProps {
  showVarianceAsPercentage: boolean;
  onToggleVarianceMode: () => void;
  visibleColumns: VisibleColumns;
  selectedHistoricalProject: string;
  onHistoricalProjectChange: (projectId: string) => void;
}

export function BudgetTableHeader({ 
  showVarianceAsPercentage, 
  onToggleVarianceMode, 
  visibleColumns,
  selectedHistoricalProject,
  onHistoricalProjectChange 
}: BudgetTableHeaderProps) {
  const { data: historicalProjects = [] } = useHistoricalProjects();

  return (
    <TableHeader>
      <TableRow className="h-8">
        <TableHead className="h-8 px-1 py-0 text-xs font-medium w-12"></TableHead>
        <TableHead className="h-8 px-1 py-0 text-xs font-medium w-20">Cost Code</TableHead>
        <TableHead className="h-8 px-1 py-0 text-xs font-medium w-40">Name</TableHead>
        <TableHead className="h-8 px-1 py-0 text-xs font-medium w-24">Source</TableHead>
        {visibleColumns.cost && (
          <TableHead className="h-8 px-3 py-0 text-xs font-medium w-32">Cost</TableHead>
        )}
        {visibleColumns.unit && (
          <TableHead className="h-8 px-3 py-0 text-xs font-medium w-20">Unit</TableHead>
        )}
        {visibleColumns.quantity && (
          <TableHead className="h-8 px-3 py-0 text-xs font-medium w-24">Quantity</TableHead>
        )}
        <TableHead className="h-8 px-3 py-0 text-xs font-medium w-32">Total Budget</TableHead>
        {visibleColumns.historicalCosts && (
          <TableHead className="h-8 px-3 py-0 text-xs font-medium w-48">
            {historicalProjects.length > 0 ? (
              <Select value={selectedHistoricalProject} onValueChange={onHistoricalProjectChange}>
                <SelectTrigger className="h-6 -ml-3 text-xs font-medium border-0 shadow-none bg-transparent hover:bg-muted w-auto justify-start p-0 pl-0 gap-1">
                  <span>Historical Job Costs</span>
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50">
                  {historicalProjects.map((project) => (
                    <SelectItem key={project.id} value={project.id} className="text-xs">
                      {project.address}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="-ml-3">
                Historical Job Costs
              </div>
            )}
          </TableHead>
        )}
        {visibleColumns.variance && (
          <TableHead className="h-8 px-3 py-0 text-xs font-medium w-36">
            <button
              onClick={onToggleVarianceMode}
              className="-ml-3 text-xs font-medium rounded px-1 py-0.5 whitespace-nowrap hover:bg-muted"
            >
              Historical Variance {showVarianceAsPercentage ? '%' : '$'}
            </button>
          </TableHead>
        )}
        <TableHead className="h-8 px-1 py-0 text-xs font-medium w-20 sticky right-0 bg-background z-30 text-center">Actions</TableHead>
      </TableRow>
    </TableHeader>
  );
}
