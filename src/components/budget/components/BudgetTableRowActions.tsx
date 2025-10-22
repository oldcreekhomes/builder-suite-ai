import React from 'react';
import { TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';

interface BudgetTableRowActionsProps {
  item: any;
  costCode: any;
  onDelete: (itemId: string) => void;
  onViewDetailsClick: () => void;
  isDeleting?: boolean;
  hasSelectedBid?: boolean;
}

export function BudgetTableRowActions({ 
  item, 
  costCode, 
  onDelete, 
  onViewDetailsClick,
  isDeleting = false,
  hasSelectedBid = false
}: BudgetTableRowActionsProps) {
  return (
    <TableCell className="py-1 sticky right-0 bg-background">
      <div className="flex items-center justify-center">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          title="View Details & Select Bid"
          onClick={onViewDetailsClick}
        >
          <Eye className="h-4 w-4 text-muted-foreground" />
        </Button>
      </div>
    </TableCell>
  );
}
