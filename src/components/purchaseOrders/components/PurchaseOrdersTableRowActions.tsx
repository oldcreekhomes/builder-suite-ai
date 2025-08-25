import React from 'react';
import { TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { DeleteButton } from '@/components/ui/delete-button';
import { Send, TestTube, Edit } from 'lucide-react';
import type { PurchaseOrder } from '@/hooks/usePurchaseOrders';

interface PurchaseOrdersTableRowActionsProps {
  item: PurchaseOrder;
  costCode: any;
  onDelete: (itemId: string) => void;
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
      <div className="flex items-center justify-end space-x-1">            
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          title="Send Purchase Order"
          onClick={onSendClick}
        >
          <Send className="h-4 w-4 text-black" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          title="Send Test Email"
          onClick={onTestEmailClick}
        >
          <TestTube className="h-4 w-4 text-blue-600" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          title="Edit Purchase Order"
          onClick={onEditClick}
        >
          <Edit className="h-4 w-4 text-foreground" />
        </Button>
        <DeleteButton
          onDelete={() => onDelete(item.id)}
          title="Delete Purchase Order"
          description={`Are you sure you want to delete the purchase order "${costCode?.code} - ${costCode?.name}"? This action cannot be undone.`}
          size="sm"
          variant="ghost"
          isLoading={isDeleting}
          showIcon={true}
        />
      </div>
    </TableCell>
  );
}