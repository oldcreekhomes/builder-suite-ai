
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
        <TableHead className="h-8 px-3 py-0 text-xs font-medium w-32">
          <span className={visibleColumns.cost ? '' : 'opacity-0'}>Cost</span>
        </TableHead>
        <TableHead className="h-8 px-3 py-0 text-xs font-medium w-20">
          <span className={visibleColumns.unit ? '' : 'opacity-0'}>Unit</span>
        </TableHead>
        <TableHead className="h-8 px-3 py-0 text-xs font-medium w-24">
          <span className={visibleColumns.quantity ? '' : 'opacity-0'}>Quantity</span>
        </TableHead>
        <TableHead className="h-8 px-3 py-0 text-xs font-medium w-32">
          <span className={visibleColumns.totalBudget ? '' : 'opacity-0'}>Total Budget</span>
        </TableHead>
        <TableHead className="h-8 px-3 py-0 text-xs font-medium w-32">
          <span className={visibleColumns.committedPOs ? '' : 'opacity-0'}>Committed PO's</span>
        </TableHead>
        <TableHead className="h-8 px-3 py-0 text-xs font-medium w-48">
          {visibleColumns.historicalCosts && historicalProjects.length > 0 ? (
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
            <div className={`-ml-3 ${visibleColumns.historicalCosts ? '' : 'opacity-0 select-none pointer-events-none'}`}>
              Historical Job Costs
            </div>
          )}
        </TableHead>
        <TableHead className="h-8 px-3 py-0 text-xs font-medium w-36">
          <button
            onClick={onToggleVarianceMode}
            className={`-ml-3 text-xs font-medium rounded px-1 py-0.5 whitespace-nowrap ${visibleColumns.variance ? 'hover:bg-muted' : 'opacity-0 pointer-events-none'}`}
          >
            Historical Variance {showVarianceAsPercentage ? '%' : '$'}
          </button>
        </TableHead>
        <TableHead className="h-8 px-1 py-0 text-xs font-medium w-20 sticky right-0 bg-background z-30 text-center">Actions</TableHead>
      </TableRow>
    </TableHeader>
  );
}
