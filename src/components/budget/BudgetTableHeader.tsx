
import React from 'react';
import { TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { useHistoricalProjects } from '@/hooks/useHistoricalProjects';
import { VisibleColumns } from './BudgetColumnVisibilityDropdown';

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
      <TableRow className="h-10 border-b-2">
        <TableHead className="h-10 px-3 py-2 text-xs font-semibold w-12"></TableHead>
        <TableHead className="h-10 pl-12 pr-3 py-2 text-xs font-semibold w-40">Cost Code</TableHead>
        <TableHead className="h-10 px-3 py-2 text-xs font-semibold w-48">Source</TableHead>
        <TableHead className="h-10 px-3 py-2 text-xs font-semibold w-52 text-right">Total Budget</TableHead>
        <TableHead className="h-10 px-3 py-2 text-xs font-semibold flex-1 min-w-[250px]">Name</TableHead>
        {visibleColumns.historicalCosts && (
          <TableHead className="h-10 px-3 py-2 text-xs font-semibold w-52 text-right">
            {historicalProjects.length > 0 ? (
              <Select value={selectedHistoricalProject} onValueChange={onHistoricalProjectChange}>
                <SelectTrigger className="h-6 -ml-3 text-xs font-semibold border-0 shadow-none bg-transparent hover:bg-muted w-auto justify-start p-0 pl-0 gap-1">
                  <span>Historical</span>
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
                Historical
              </div>
            )}
          </TableHead>
        )}
        {visibleColumns.variance && (
          <TableHead className="h-10 px-3 py-2 text-xs font-semibold w-48 text-right">
            <button
              onClick={onToggleVarianceMode}
              className="-ml-3 text-xs font-semibold rounded px-1 py-0.5 whitespace-nowrap hover:bg-muted"
            >
              Variance {showVarianceAsPercentage ? '%' : '$'}
            </button>
          </TableHead>
        )}
      </TableRow>
    </TableHeader>
  );
}
