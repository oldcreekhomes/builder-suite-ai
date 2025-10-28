import React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Eye, EyeOff } from 'lucide-react';

export interface VisibleColumns {
  totalBudget: boolean;
  historicalCosts: boolean;
  variance: boolean;
}

interface BudgetColumnVisibilityDropdownProps {
  visibleColumns: VisibleColumns;
  onToggleColumn: (column: keyof VisibleColumns) => void;
}

export function BudgetColumnVisibilityDropdown({ 
  visibleColumns, 
  onToggleColumn 
}: BudgetColumnVisibilityDropdownProps) {
  const columns: { key: keyof VisibleColumns; label: string }[] = [
    { key: 'totalBudget', label: 'Total Budget' },
    { key: 'historicalCosts', label: 'Historical Job Costs' },
    { key: 'variance', label: 'Historical Variance' },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Eye className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-background z-50">
        {columns.map((column) => (
          <DropdownMenuItem
            key={column.key}
            onSelect={(e) => {
              e.preventDefault();
              onToggleColumn(column.key);
            }}
            className="flex items-center justify-between cursor-pointer"
          >
            <span>{column.label}</span>
            {visibleColumns[column.key] ? (
              <Eye className="h-4 w-4 text-primary" />
            ) : (
              <EyeOff className="h-4 w-4 text-muted-foreground" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
