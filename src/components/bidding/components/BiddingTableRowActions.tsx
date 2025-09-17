import React from 'react';
import { TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { DeleteButton } from '@/components/ui/delete-button';
import { Send, TestTube } from 'lucide-react';

interface BiddingTableRowActionsProps {
  item: any;
  costCode: any;
  onDelete: (itemId: string) => void;
  onSendClick: () => void;
  onTestEmailClick?: () => void;
  isDeleting?: boolean;
  isReadOnly?: boolean;
}

export function BiddingTableRowActions({ 
  item, 
  costCode, 
  onDelete, 
  onSendClick,
  onTestEmailClick,
  isDeleting = false,
  isReadOnly = false 
}: BiddingTableRowActionsProps) {
  return (
    <TableCell className="py-1 pl-0">
      <div className="flex items-center justify-start space-x-0.5">
        {!isReadOnly && (
          <>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              title="Send Bid Package"
              onClick={onSendClick}
            >
              <Send className="h-4 w-4 text-black" />
            </Button>
            {onTestEmailClick && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                title="Send Test Email"
                onClick={onTestEmailClick}
              >
                <TestTube className="h-4 w-4 text-blue-600" />
              </Button>
            )}
          </>
        )}
        <DeleteButton
          onDelete={() => onDelete(item.id)}
          title="Delete Bidding Item"
          description={`Are you sure you want to delete the bidding item "${costCode?.code} - ${costCode?.name}"? This action cannot be undone.`}
          size="sm"
          variant="ghost"
          isLoading={isDeleting}
          showIcon={true}
        />
      </div>
    </TableCell>
  );
}