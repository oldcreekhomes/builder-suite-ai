import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { PurchaseOrder } from '@/hooks/usePurchaseOrders';

interface ViewCommittedCostsModalProps {
  isOpen: boolean;
  onClose: () => void;
  costCode: { code: string; name: string } | null;
  purchaseOrders: PurchaseOrder[];
}

export function ViewCommittedCostsModal({
  isOpen,
  onClose,
  costCode,
  purchaseOrders
}: ViewCommittedCostsModalProps) {
  if (!costCode) return null;

  const formatCurrency = (amount: number | null) => {
    return `$${Math.round(amount || 0).toLocaleString()}`;
  };

  const totalCommitted = purchaseOrders.reduce((sum, po) => sum + (po.total_amount || 0), 0);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return 'text-green-600';
      case 'pending':
        return 'text-yellow-600';
      case 'draft':
        return 'text-gray-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Committed Costs - {costCode.code} {costCode.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr className="h-8">
                  <th className="py-1 px-2 text-left text-xs font-medium">Company</th>
                  <th className="py-1 px-2 text-right text-xs font-medium">Amount</th>
                  <th className="py-1 px-2 text-left text-xs font-medium">Status</th>
                  <th className="py-1 px-2 text-left text-xs font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {purchaseOrders.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-4 px-2 text-center text-gray-500 text-xs">
                      No purchase orders found for this cost code
                    </td>
                  </tr>
                ) : (
                  purchaseOrders.map((po) => (
                    <tr key={po.id} className="border-b last:border-0">
                      <td className="py-1 px-2 text-xs">
                        {po.companies?.company_name || '-'}
                      </td>
                      <td className="py-1 px-2 text-right text-xs">
                        {formatCurrency(po.total_amount)}
                      </td>
                      <td className="py-1 px-2 text-xs">
                        <span className={getStatusColor(po.status)}>
                          {po.status}
                        </span>
                      </td>
                      <td className="py-1 px-2 text-xs text-gray-600">
                        {po.notes || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {purchaseOrders.length > 0 && (
            <div className="flex justify-end pt-2 border-t">
              <div className="text-sm font-medium">
                Total Committed Costs: {formatCurrency(totalCommitted)}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
