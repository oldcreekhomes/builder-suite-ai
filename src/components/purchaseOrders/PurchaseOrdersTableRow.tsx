import React, { useState } from 'react';
import { PurchaseOrdersTableRowContent } from './components/PurchaseOrdersTableRowContent';
import { SendPOEmailModal } from './SendPOEmailModal';
import { SendPOTestEmailModal } from './SendPOTestEmailModal';
import type { PurchaseOrder } from '@/hooks/usePurchaseOrders';

interface PurchaseOrdersTableRowProps {
  item: PurchaseOrder;
  onDelete: (itemId: string) => void;
  onUpdateNotes: (itemId: string, notes: string) => void;
  isSelected: boolean;
  onCheckboxChange: (itemId: string, checked: boolean) => void;
  isDeleting?: boolean;
  projectAddress?: string;
  projectId: string;
  onEditClick: (item: PurchaseOrder) => void;
}

export function PurchaseOrdersTableRow({
  item,
  onDelete,
  onUpdateNotes,
  isSelected,
  onCheckboxChange,
  isDeleting = false,
  projectAddress,
  projectId,
  onEditClick
}: PurchaseOrdersTableRowProps) {
  const [showSendModal, setShowSendModal] = useState(false);
  const [showTestEmailModal, setShowTestEmailModal] = useState(false);

  return (
    <>
      <PurchaseOrdersTableRowContent
        item={item}
        isSelected={isSelected}
        isDeleting={isDeleting}
        onCheckboxChange={onCheckboxChange}
        onUpdateNotes={onUpdateNotes}
        onDelete={onDelete}
        onSendClick={() => setShowSendModal(true)}
        onTestEmailClick={() => setShowTestEmailModal(true)}
        onEditClick={() => onEditClick(item)}
        projectId={projectId}
      />
      
      <SendPOEmailModal
        open={showSendModal}
        onOpenChange={setShowSendModal}
        purchaseOrder={item}
        projectAddress={projectAddress}
      />
      
      <SendPOTestEmailModal
        open={showTestEmailModal}
        onOpenChange={setShowTestEmailModal}
        purchaseOrder={item}
        projectAddress={projectAddress}
      />
    </>
  );
}