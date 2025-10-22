import React from 'react';
import { TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { DollarSign, Eye } from 'lucide-react';

interface BudgetTableRowActionsProps {
  item: any;
  costCode: any;
  onDelete: (itemId: string) => void;
  onSelectBidClick: () => void;
  onViewDetailsClick: () => void;
  isDeleting?: boolean;
  hasSelectedBid?: boolean;
}

export function BudgetTableRowActions({ 
  item, 
  costCode, 
  onDelete, 
  onSelectBidClick,
  onViewDetailsClick,
  isDeleting = false,
  hasSelectedBid = false
}: BudgetTableRowActionsProps) {
  return (
    <TableCell className="py-1 sticky right-0 bg-background">
      <div className="flex items-center justify-center space-x-0.5">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          title="Select Vendor BID"
          onClick={onSelectBidClick}
        >
          <DollarSign 
            className={`h-4 w-4 ${hasSelectedBid ? 'text-blue-600' : 'text-muted-foreground'}`} 
          />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          title="View Details"
          onClick={onViewDetailsClick}
        >
          <Eye className="h-4 w-4 text-muted-foreground" />
        </Button>
      </div>
    </TableCell>
  );
}
