import { useVendorPurchaseOrders } from "@/hooks/useVendorPurchaseOrders";
import { Badge } from "@/components/ui/badge";
import { FileText, Loader2, AlertCircle, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface VendorPOInfoProps {
  projectId: string | null | undefined;
  vendorId: string | null | undefined;
  selectedPOId?: string;
  onSelectPO?: (poId: string | undefined) => void;
}

/**
 * Displays Purchase Order information directly below the Vendor field.
 * Always shows status when a vendor is selected - loading, error, empty, or PO list.
 */
export function VendorPOInfo({ projectId, vendorId, selectedPOId, onSelectPO }: VendorPOInfoProps) {
  const { data: purchaseOrders, isLoading, error } = useVendorPurchaseOrders(projectId, vendorId);

  // Don't render anything if no vendor selected
  if (!vendorId) {
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

  const handleRowClick = (poId: string) => {
    if (!onSelectPO) return;
    // Toggle: if already selected, deselect; otherwise select
    onSelectPO(selectedPOId === poId ? undefined : poId);
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="mt-2 p-3 rounded-lg border bg-muted/30 border-border">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Checking purchase orders…</span>
        </div>
        <div className="text-xs text-muted-foreground/60 mt-1">
          Vendor linked: …{vendorId.slice(-6)}
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    console.error('VendorPOInfo query error:', error);
    return (
      <div className="mt-2 p-3 rounded-lg border bg-destructive/10 border-destructive/30">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-destructive" />
          <span className="text-sm text-destructive font-medium">Couldn't load purchase orders</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Try refreshing the page. If the problem persists, contact support.
        </p>
        <div className="text-xs text-muted-foreground/60 mt-1">
          Vendor linked: …{vendorId.slice(-6)}
        </div>
      </div>
    );
  }

  // Show empty state (no POs found)
  if (!purchaseOrders || purchaseOrders.length === 0) {
    return (
      <div className="mt-2 p-3 rounded-lg border bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <span className="text-sm text-amber-800 dark:text-amber-200">
            No approved purchase orders found for this vendor on this project.
          </span>
        </div>
        <div className="text-xs text-muted-foreground/60 mt-1">
          Vendor linked: …{vendorId.slice(-6)}
        </div>
      </div>
    );
  }

  // Show PO list
  return (
    <div className="mt-2 p-3 rounded-lg border bg-blue-50/50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
      <div className="flex items-center gap-2 mb-2">
        <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
          {purchaseOrders.length === 1 
            ? "1 Purchase Order" 
            : `${purchaseOrders.length} Purchase Orders`}
        </span>
        <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400 ml-auto" />
        <span className="text-xs text-muted-foreground">Vendor linked</span>
      </div>
      <div className="space-y-1">
        {purchaseOrders.map((po) => {
          const isSelected = selectedPOId === po.id;
          return (
            <div 
              key={po.id} 
              onClick={() => handleRowClick(po.id)}
              className={cn(
                "grid grid-cols-[140px_1fr_160px] gap-3 items-center text-xs rounded px-2 py-1.5 border transition-all",
                onSelectPO && "cursor-pointer",
                isSelected 
                  ? "ring-2 ring-primary bg-primary/10 border-primary/50" 
                  : "bg-white dark:bg-background/50 border-blue-100 dark:border-blue-900 hover:bg-blue-100/50 dark:hover:bg-blue-900/30"
              )}
            >
              <Badge variant="outline" className="text-xs font-mono whitespace-nowrap w-fit">
                {po.po_number}
              </Badge>
              {po.cost_code ? (
                <span 
                  className="text-muted-foreground truncate"
                  title={`${po.cost_code.code} - ${po.cost_code.name}`}
                >
                  {po.cost_code.code} - {po.cost_code.name}
                </span>
              ) : (
                <span className="text-muted-foreground/50">—</span>
              )}
              <span className="text-right whitespace-nowrap text-muted-foreground">
                {formatCurrency(po.remaining)} / {formatCurrency(po.total_amount)}
              </span>
            </div>
          );
        })}
      </div>
      {purchaseOrders.length === 1 && (
        <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
          This bill will be linked to PO {purchaseOrders[0].po_number} by default (unless you override per line item).
        </p>
      )}
      {purchaseOrders.length > 1 && (
        <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
          Click to select a PO, or let it auto-match by cost code.
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
