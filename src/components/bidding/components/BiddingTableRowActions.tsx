import React from 'react';
import { TableCell } from '@/components/ui/table';
import { TableRowActions } from '@/components/ui/table-row-actions';

interface BiddingTableRowActionsProps {
  item: any;
  costCode: any;
  onDelete: (itemId: string) => void;
  onSendClick: () => void;
  onTestEmailClick?: () => void;
  onAddCompaniesClick?: () => void;
  isDeleting?: boolean;
  isReadOnly?: boolean;
}

export function BiddingTableRowActions({ 
  item, 
  costCode, 
  onDelete, 
  onSendClick,
  onTestEmailClick,
  onAddCompaniesClick,
  isDeleting = false,
  isReadOnly = false 
}: BiddingTableRowActionsProps) {
  return (
    <TableCell className="py-1">
      <TableRowActions actions={[
        { label: "Send Bid Package", onClick: onSendClick, hidden: isReadOnly },
        { label: "Send Test Email", onClick: onTestEmailClick || (() => {}), hidden: isReadOnly || !onTestEmailClick },
        { label: "Add Companies", onClick: onAddCompaniesClick || (() => {}), hidden: isReadOnly || !onAddCompaniesClick },
        { label: "Delete", onClick: () => onDelete(item.id), variant: "destructive", requiresConfirmation: true, confirmTitle: "Delete Bidding Item", confirmDescription: `Are you sure you want to delete the bidding item "${costCode?.code} - ${costCode?.name}"? This action cannot be undone.`, isLoading: isDeleting },
      ]} />
    </TableCell>
  );
}
