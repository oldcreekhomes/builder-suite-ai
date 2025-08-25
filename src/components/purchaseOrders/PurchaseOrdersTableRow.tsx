import React, { useState } from 'react';
import { PurchaseOrdersTableRowContent } from './components/PurchaseOrdersTableRowContent';
import { SendPOEmailModal } from './SendPOEmailModal';
import { SendPOTestEmailModal } from './SendPOTestEmailModal';
import type { PurchaseOrder } from '@/hooks/usePurchaseOrders';

interface PurchaseOrdersTableRowProps {
  item: PurchaseOrder;
  onDelete: (itemId: string) => void;
  onUpdateStatus: (itemId: string, status: string) => void;
  onUpdateNotes: (itemId: string, notes: string) => void;
  isSelected: boolean;
  onCheckboxChange: (itemId: string, checked: boolean) => void;
  isDeleting?: boolean;
  projectAddress?: string;
  onEditClick: (item: PurchaseOrder) => void;
}

export function PurchaseOrdersTableRow({
  item,
  onDelete,
  onUpdateStatus,
  onUpdateNotes,
  isSelected,
  onCheckboxChange,
  isDeleting = false,
  projectAddress,
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
        onUpdateStatus={onUpdateStatus}
        onUpdateNotes={onUpdateNotes}
        onDelete={onDelete}
        onSendClick={() => setShowSendModal(true)}
        onTestEmailClick={() => setShowTestEmailModal(true)}
        onEditClick={() => onEditClick(item)}
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