import React, { useState } from 'react';
import { TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Paperclip } from 'lucide-react';
import { EditBiddingSpecificationsModal } from '../EditBiddingSpecificationsModal';

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
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSpecsModal(true)}
              className="h-8 w-8 p-0"
              title={isReadOnly ? "View Specifications" : "View/Edit Specifications"}
            >
              <Paperclip className="h-4 w-4 text-blue-600" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSpecsModal(true)}
              className="h-8 text-xs px-2"
              title={isReadOnly ? "View Specifications" : "Add Specifications"}
            >
              {isReadOnly ? 'View Specs' : 'Add Specs'}
            </Button>
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