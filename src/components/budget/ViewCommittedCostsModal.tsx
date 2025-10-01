import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { PurchaseOrder } from '@/hooks/usePurchaseOrders';
import { getFileIcon, getFileIconColor } from '../bidding/utils/fileIconUtils';
import { openFileViaRedirect } from '@/utils/fileOpenUtils';

interface ViewCommittedCostsModalProps {
  isOpen: boolean;
  onClose: () => void;
  costCode: { code: string; name: string } | null;
  purchaseOrders: PurchaseOrder[];
  projectId?: string;
}

export function ViewCommittedCostsModal({
  isOpen,
  onClose,
  costCode,
  purchaseOrders,
  projectId
}: ViewCommittedCostsModalProps) {
  if (!costCode) return null;

  const formatCurrency = (amount: number | null) => {
    return `$${Math.round(amount || 0).toLocaleString()}`;
  };

  const totalCommitted = purchaseOrders.reduce((sum, po) => sum + (po.total_amount || 0), 0);

  const capitalizeFirstLetter = (str: string) => {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

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

  const handleFilePreview = (file: any, po: PurchaseOrder) => {
    const fileName = file.name || file.id || file;
    
    if (file.bucket && file.path) {
      openFileViaRedirect(file.bucket, file.path, fileName);
      return;
    }
    
    if (file.url) {
      try {
        const url = new URL(file.url);
        const pathParts = url.pathname.split('/object/public/');
        if (pathParts.length === 2) {
          const [bucket, ...pathSegments] = pathParts[1].split('/');
          const path = pathSegments.join('/');
          openFileViaRedirect(bucket, decodeURIComponent(path), fileName);
          return;
        }
      } catch (error) {
        console.error('Failed to parse file URL:', error);
      }
    }
    
    if (projectId) {
      const filePath = `purchase-orders/${projectId}/${file.id || file.name || file}`;
      openFileViaRedirect('project-files', filePath, fileName);
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
                  <th className="py-1 px-4 text-left text-xs font-medium w-[35%]">Company</th>
                  <th className="py-1 px-4 text-left text-xs font-medium w-[20%]">Amount</th>
                  <th className="py-1 px-4 text-left text-xs font-medium w-[20%]">Status</th>
                  <th className="py-1 px-4 text-right text-xs font-medium w-[25%]">Files</th>
                </tr>
              </thead>
              <tbody>
                {purchaseOrders.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-4 px-4 text-center text-gray-500 text-xs">
                      No purchase orders found for this cost code
                    </td>
                  </tr>
                ) : (
                  purchaseOrders.map((po) => {
                    const files = po.files && Array.isArray(po.files) ? po.files : [];
                    return (
                      <tr key={po.id} className="border-b last:border-0">
                        <td className="py-1 px-4 text-xs w-[35%]">
                          {po.companies?.company_name || '-'}
                        </td>
                        <td className="py-1 px-4 text-xs w-[20%]">
                          {formatCurrency(po.total_amount)}
                        </td>
                        <td className="py-1 px-4 text-xs w-[20%]">
                          <span className={getStatusColor(po.status)}>
                            {capitalizeFirstLetter(po.status)}
                          </span>
                        </td>
                        <td className="py-1 px-4 text-xs w-[25%]">
                          {files.length === 0 ? (
                            <div className="flex justify-end">
                              <span className="text-muted-foreground">—</span>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-1">
                              {files.slice(0, 3).map((file: any, index: number) => {
                                const fileName = file.name || file.id || file;
                                const IconComponent = getFileIcon(fileName);
                                const iconColorClass = getFileIconColor(fileName);
                                return (
                                  <button
                                    key={`${fileName}-${index}`}
                                    onClick={() => handleFilePreview(file, po)}
                                    className={`inline-block ${iconColorClass} transition-colors p-1`}
                                    title={fileName}
                                  >
                                    <IconComponent className="h-4 w-4" />
                                  </button>
                                );
                              })}
                              {files.length > 3 && (
                                <span className="text-xs text-muted-foreground ml-1">
                                  +{files.length - 3}
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
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
