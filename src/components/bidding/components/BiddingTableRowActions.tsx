import React from 'react';
import { TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { DeleteButton } from '@/components/ui/delete-button';
import { Send, TestTube, Plus } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
      <div className="flex items-center justify-start space-x-0.5">
        {!isReadOnly && (
          <>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={onSendClick}
                  >
                    <Send className="h-4 w-4 text-black" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Send Bid Package</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {onTestEmailClick && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={onTestEmailClick}
                    >
                      <TestTube className="h-4 w-4 text-blue-600" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Send Test Email</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {onAddCompaniesClick && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={onAddCompaniesClick}
                    >
                      <Plus className="h-4 w-4 text-green-600" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Add Companies</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </>
        )}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <DeleteButton
                  onDelete={() => onDelete(item.id)}
                  title="Delete Bidding Item"
                  description={`Are you sure you want to delete the bidding item "${costCode?.code} - ${costCode?.name}"? This action cannot be undone.`}
                  size="sm"
                  variant="ghost"
                  isLoading={isDeleting}
                  showIcon={true}
                />
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>Delete</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </TableCell>
  );
}