import React, { useState } from 'react';
import { TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Paperclip } from 'lucide-react';
import { EditBiddingSpecificationsModal } from '../EditBiddingSpecificationsModal';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface BiddingTableRowSpecsProps {
  item: any;
  costCode: any;
  onUpdateSpecifications: (itemId: string, specifications: string) => void;
  isReadOnly?: boolean;
}

export function BiddingTableRowSpecs({ 
  item, 
  costCode, 
  onUpdateSpecifications,
  isReadOnly = false 
}: BiddingTableRowSpecsProps) {
  const [showSpecsModal, setShowSpecsModal] = useState(false);

  return (
    <>
      <TableCell className="py-1">
        <div className="flex items-center justify-start">
          {item.specifications && item.specifications.trim() !== '' ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSpecsModal(true)}
                  className="h-8 w-8 p-0"
                >
                  <Paperclip className="h-4 w-4 text-blue-600" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isReadOnly ? "View Specifications" : "View/Edit Specifications"}</p>
              </TooltipContent>
            </Tooltip>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSpecsModal(true)}
                  className="h-8 text-xs px-2"
                >
                  {isReadOnly ? 'View Specs' : 'Add Specs'}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isReadOnly ? "View Specifications" : "Add Specifications"}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </TableCell>

      <EditBiddingSpecificationsModal
        open={showSpecsModal}
        onOpenChange={setShowSpecsModal}
        costCodeName={costCode?.name || ''}
        costCodeCode={costCode?.code || ''}
        specifications={item.specifications || ''}
        onUpdateSpecifications={async (specifications) => {
          await onUpdateSpecifications(item.id, specifications);
        }}
        isReadOnly={isReadOnly}
      />
    </>
  );
}