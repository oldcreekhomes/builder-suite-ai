import React from 'react';
import { TableCell } from '@/components/ui/table';
import { TableRowActions } from '@/components/ui/table-row-actions';
import type { PurchaseOrder } from '@/hooks/usePurchaseOrders';

interface PurchaseOrdersTableRowActionsProps {
  item: PurchaseOrder;
  costCode: any;
  onDelete: (item: PurchaseOrder) => void;
  onSendClick: () => void;
  onTestEmailClick: () => void;
  onEditClick: () => void;
  isDeleting?: boolean;
}

export function PurchaseOrdersTableRowActions({ 
  item, 
  costCode, 
  onDelete, 
  onSendClick,
  onTestEmailClick,
  onEditClick,
  isDeleting = false
}: PurchaseOrdersTableRowActionsProps) {
  return (
    <TableCell className="py-1">
      <TableRowActions actions={[
        { label: "Send Purchase Order", onClick: onSendClick },
        { label: "Send Test Email", onClick: onTestEmailClick },
        { label: "Edit", onClick: onEditClick },
        { label: "Cancel Purchase Order", onClick: () => onDelete(item), variant: "destructive", requiresConfirmation: true, confirmTitle: "Cancel Purchase Order", confirmDescription: `Are you sure you want to cancel PO "${item.po_number}"? A cancellation email will be sent to all company representatives who receive PO notifications.`, isLoading: isDeleting },
      ]} />
    </TableCell>
  );
}
