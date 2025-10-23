import React from 'react';
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
    <Button
      variant="ghost"
      size="sm"
      className="h-8 w-8 p-0"
      title="View Details & Select Bid"
      onClick={onViewDetailsClick}
    >
      <Eye className="h-4 w-4 text-muted-foreground" />
    </Button>
  );
}
