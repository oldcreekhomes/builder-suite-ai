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
  cellClassName?: string;
  onCellClick?: (e: React.MouseEvent) => void;
  asDiv?: boolean;
}

export function BiddingTableRowSpecs({ 
  item, 
  costCode, 
  onUpdateSpecifications,
  isReadOnly = false,
  cellClassName,
  onCellClick,
  asDiv = false
}: BiddingTableRowSpecsProps) {
  const [showSpecsModal, setShowSpecsModal] = useState(false);

  const content = (
    <div className="flex items-center justify-center">
      {item.specifications && item.specifications.trim() !== '' ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSpecsModal(true)}
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
  );

  const Wrapper = asDiv ? 'div' : TableCell;

  return (
    <>
      <Wrapper className={cellClassName} onClick={onCellClick}>
        {content}
      </Wrapper>

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