import React from 'react';
import type { PurchaseOrder } from '@/hooks/usePurchaseOrders';

interface PurchaseOrdersTableFooterProps {
  purchaseOrders: PurchaseOrder[];
}

export function PurchaseOrdersTableFooter({ purchaseOrders }: PurchaseOrdersTableFooterProps) {
  if (purchaseOrders.length === 0) return null;

  const totalAmount = purchaseOrders.reduce((sum, po) => sum + (po.total_amount || 0), 0);

  return (
    <div className="flex justify-between items-center">
      <div className="text-lg font-semibold">
        Total Items: {purchaseOrders.length}
      </div>
      <div className="text-lg font-semibold">
        Total Amount: ${totalAmount.toLocaleString()}
      </div>
    </div>
  );
}