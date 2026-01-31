import { useVendorPurchaseOrders } from "@/hooks/useVendorPurchaseOrders";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";

interface VendorPOInfoProps {
  projectId: string | null | undefined;
  vendorId: string | null | undefined;
}

/**
 * Displays Purchase Order information directly below the Vendor field.
 * Shows all POs for the selected vendor on this project (if any exist).
 */
export function VendorPOInfo({ projectId, vendorId }: VendorPOInfoProps) {
  const { data: purchaseOrders, isLoading } = useVendorPurchaseOrders(projectId, vendorId);

  // Don't render anything if no vendor selected or still loading
  if (!vendorId || isLoading) {
    return null;
  }

  // No POs for this vendor on this project
  if (!purchaseOrders || purchaseOrders.length === 0) {
    return null;
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="mt-2 p-3 rounded-lg border bg-blue-50/50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
      <div className="flex items-center gap-2 mb-2">
        <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
          {purchaseOrders.length === 1 
            ? "1 Purchase Order" 
            : `${purchaseOrders.length} Purchase Orders`}
        </span>
      </div>
      <div className="space-y-1.5">
        {purchaseOrders.map((po) => (
          <div 
            key={po.id} 
            className="flex items-center justify-between text-xs bg-white dark:bg-background/50 rounded px-2 py-1.5 border border-blue-100 dark:border-blue-900"
          >
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs font-mono">
                {po.po_number}
              </Badge>
              {po.cost_code && (
                <span className="text-muted-foreground">
                  {po.cost_code.code} - {po.cost_code.name}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">
                {formatCurrency(po.remaining)} remaining
              </span>
              <span className="text-muted-foreground/60">
                of {formatCurrency(po.total_amount)}
              </span>
            </div>
          </div>
        ))}
      </div>
      {purchaseOrders.length > 1 && (
        <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
          Select specific PO in Job Cost rows below, or let it auto-match by cost code.
        </p>
      )}
    </div>
  );
}

/**
 * Hook to check if a vendor has any POs for the project (not just 2+)
 */
export function useVendorHasPOs(
  projectId: string | null | undefined,
  vendorId: string | null | undefined
): { hasPOs: boolean; poCount: number; isLoading: boolean } {
  const { data: purchaseOrders, isLoading } = useVendorPurchaseOrders(projectId, vendorId);
  return {
    hasPOs: (purchaseOrders?.length || 0) > 0,
    poCount: purchaseOrders?.length || 0,
    isLoading,
  };
}
