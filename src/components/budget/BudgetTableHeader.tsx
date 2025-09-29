
import React from 'react';
import { TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useHistoricalProjects } from '@/hooks/useHistoricalProjects';

interface BudgetTableHeaderProps {
  selectedHistoricalProject: string;
  onHistoricalProjectChange: (projectId: string) => void;
  showVarianceAsPercentage: boolean;
  onToggleVarianceMode: () => void;
}

export function BudgetTableHeader({ selectedHistoricalProject, onHistoricalProjectChange, showVarianceAsPercentage, onToggleVarianceMode }: BudgetTableHeaderProps) {
  const { data: historicalProjects = [] } = useHistoricalProjects();

  return (
    <TableHeader>
      <TableRow className="h-8">
        <TableHead className="h-8 px-1 py-0 text-xs font-medium w-12"></TableHead>
        <TableHead className="h-8 px-1 py-0 text-xs font-medium w-20">Cost Code</TableHead>
        <TableHead className="h-8 px-1 py-0 text-xs font-medium w-40">Name</TableHead>
        <TableHead className="h-8 px-1 py-0 text-xs font-medium w-20">Price</TableHead>
        <TableHead className="h-8 px-1 py-0 text-xs font-medium w-16">Unit</TableHead>
        <TableHead className="h-8 px-1 py-0 text-xs font-medium w-20">Quantity</TableHead>
        <TableHead className="h-8 px-1 py-0 text-xs font-medium w-24">Total</TableHead>
        <TableHead className="h-8 px-1 py-0 text-xs font-medium w-24">
          {historicalProjects.length > 0 && (
            <Select value={selectedHistoricalProject} onValueChange={onHistoricalProjectChange}>
              <SelectTrigger className="h-6 text-xs border-0 shadow-none bg-transparent hover:bg-muted w-full">
                <SelectValue placeholder="Historical" />
              </SelectTrigger>
              <SelectContent>
                {historicalProjects.map((project) => (
                  <SelectItem key={project.id} value={project.id} className="text-xs">
                    {project.address}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {historicalProjects.length === 0 && "Historical"}
        </TableHead>
        <TableHead className="h-8 px-1 py-0 text-xs font-medium w-24">
          <button
            onClick={onToggleVarianceMode}
            className="text-xs font-medium hover:bg-muted rounded px-1 py-0.5"
          >
            Variance {showVarianceAsPercentage ? '%' : '$'}
          </button>
        </TableHead>
        <TableHead className="h-8 px-1 py-0 text-xs font-medium w-20">Actions</TableHead>
      </TableRow>
    </TableHeader>
  );
}
