
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
  headerRef?: React.RefObject<HTMLTableSectionElement>;
}

export function BudgetTableHeader({ 
  showVarianceAsPercentage, 
  onToggleVarianceMode,
  visibleColumns,
  selectedHistoricalProject,
  onHistoricalProjectChange,
  headerRef
}: BudgetTableHeaderProps) {
  const { data: historicalProjects = [] } = useHistoricalProjects();

  return (
    <TableHeader ref={headerRef}>
      <TableRow className="border-b-2">
        <TableHead className="w-12"></TableHead>
        <TableHead className="pl-12 w-40">Cost Code</TableHead>
        <TableHead className="w-[340px]">Name</TableHead>
        <TableHead className="w-36">Source</TableHead>
        <TableHead className="w-10 text-center px-0">
          <span className="sr-only">Warnings</span>
        </TableHead>
        <TableHead className="w-60">Total Budget</TableHead>
        <TableHead className="w-48">Comment</TableHead>
        {visibleColumns.historicalCosts && (
          <TableHead className="w-52">
            {historicalProjects.length > 0 ? (
              <Select value={selectedHistoricalProject || "none"} onValueChange={(value) => onHistoricalProjectChange(value === "none" ? "" : value)}>
                <SelectTrigger className="h-6 text-sm font-medium border-0 shadow-none bg-transparent hover:bg-muted w-auto justify-start p-0 gap-1">
                  <span>Historical</span>
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50">
                  <SelectItem value="none" className="text-xs">
                    None
                  </SelectItem>
                  {historicalProjects.map((project) => (
                    <SelectItem key={project.id} value={project.id} className="text-xs">
                      {project.address}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div>
                Historical
              </div>
            )}
          </TableHead>
        )}
        {visibleColumns.variance && (
          <TableHead className="w-48">
            <button
              onClick={onToggleVarianceMode}
              className="rounded px-1 py-0.5 whitespace-nowrap hover:bg-muted"
            >
              Variance {showVarianceAsPercentage ? '%' : '$'}
            </button>
          </TableHead>
        )}
      </TableRow>
    </TableHeader>
  );
}
