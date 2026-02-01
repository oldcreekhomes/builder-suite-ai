import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useVendorPurchaseOrders, VendorPurchaseOrder } from "@/hooks/useVendorPurchaseOrders";
import { PODetailsDialog } from "./PODetailsDialog";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface POSelectionDropdownProps {
  projectId: string | null | undefined;
  vendorId: string | null | undefined;
  value: string | undefined;
  onChange: (poId: string | undefined) => void;
  costCodeId?: string; // Optional: highlight matching POs
  className?: string;
  disabled?: boolean;
}

/**
 * Dropdown to select a specific Purchase Order for a bill line.
 * Only renders when the vendor has 2+ POs for the project.
 * Shows PO number, cost code name, and remaining/total balance.
 */
export function POSelectionDropdown({
  projectId,
  vendorId,
  value,
  onChange,
  costCodeId,
  className,
  disabled = false,
}: POSelectionDropdownProps) {
  const { data: purchaseOrders, isLoading } = useVendorPurchaseOrders(projectId, vendorId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPOForDialog, setSelectedPOForDialog] = useState<VendorPurchaseOrder | null>(null);

  // Don't render if no POs or only 1 PO (auto-match handles it)
  if (!purchaseOrders || purchaseOrders.length < 2) {
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

  const getPOLabel = (po: VendorPurchaseOrder) => {
    const costCodeStr = po.cost_code 
      ? `${po.cost_code.code} - ${po.cost_code.name}` 
      : '';
    const amountStr = `${formatCurrency(po.remaining)} / ${formatCurrency(po.total_amount)}`;
    return `${po.po_number} | ${costCodeStr} | ${amountStr}`;
  };

  const handleChange = (val: string) => {
    if (val === '__auto__') {
      onChange(undefined);
    } else {
      onChange(val);
    }
  };

  const handleInfoClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Find the currently selected PO, or show the first one if auto-match
    const poToShow = value 
      ? purchaseOrders.find(po => po.id === value) 
      : purchaseOrders[0];
    if (poToShow) {
      setSelectedPOForDialog(poToShow);
      setDialogOpen(true);
    }
  };

  return (
    <div className="flex items-center gap-1">
      <Select
        value={value || '__auto__'}
        onValueChange={handleChange}
        disabled={disabled || isLoading}
      >
        <SelectTrigger className={cn("h-8 flex-1", className)}>
          <SelectValue placeholder="Auto-match" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__auto__" className="text-muted-foreground">
            Auto-match by cost code
          </SelectItem>
          {purchaseOrders.map((po) => {
            const isMatchingCostCode = costCodeId && po.cost_code_id === costCodeId;
            return (
              <SelectItem 
                key={po.id} 
                value={po.id}
                className={cn(isMatchingCostCode && "font-medium")}
              >
                <span className={cn(isMatchingCostCode && "text-primary")}>
                  {getPOLabel(po)}
                </span>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
      
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0"
        onClick={handleInfoClick}
        disabled={disabled}
      >
        <Info className="h-4 w-4 text-muted-foreground" />
      </Button>

      <PODetailsDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        purchaseOrder={selectedPOForDialog}
        projectId={projectId}
        vendorId={vendorId}
      />
    </div>
  );
}

/**
 * Hook variant that just returns whether PO selection UI should be shown
 */
export function useShouldShowPOSelection(
  projectId: string | null | undefined,
  vendorId: string | null | undefined
): boolean {
  const { data: purchaseOrders } = useVendorPurchaseOrders(projectId, vendorId);
  return (purchaseOrders?.length || 0) >= 2;
}
