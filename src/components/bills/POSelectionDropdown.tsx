import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useVendorPurchaseOrders, VendorPurchaseOrder } from "@/hooks/useVendorPurchaseOrders";
import { PODetailsDialog } from "./PODetailsDialog";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Helper function to find a matching PO for a given cost code.
 * Used by parent components to auto-select PO when cost code changes.
 */
export function findMatchingPOForCostCode(
  purchaseOrders: VendorPurchaseOrder[] | undefined,
  costCodeId: string | undefined
): string | undefined {
  if (!purchaseOrders || !costCodeId) return undefined;
  const match = purchaseOrders.find(po => po.cost_code_id === costCodeId);
  return match?.id;
}

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
 * Always renders with "No Purchase Order" as the default option.
 * Shows PO number, cost code name, and remaining/total balance when POs exist.
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

  const hasPurchaseOrders = purchaseOrders && purchaseOrders.length > 0;
  const hasMultiplePOs = purchaseOrders && purchaseOrders.length >= 2;

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
    if (val === '__none__') {
      onChange(undefined);
    } else if (val === '__auto__') {
      onChange(undefined);
    } else {
      onChange(val);
    }
  };

  const handleInfoClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Find the currently selected PO, or show the first one if auto-match
    const poToShow = value 
      ? purchaseOrders?.find(po => po.id === value) 
      : purchaseOrders?.[0];
    if (poToShow) {
      setSelectedPOForDialog(poToShow);
      setDialogOpen(true);
    }
  };

  // Determine the default/current value for the select
  // If vendor has POs and no explicit selection, default to auto-match
  const selectValue = value || (hasPurchaseOrders ? '__auto__' : '__none__');

  return (
    <div className="flex items-center gap-1">
      <Select
        value={selectValue}
        onValueChange={handleChange}
        disabled={disabled || isLoading}
      >
        <SelectTrigger className={cn("h-8 flex-1", className)}>
          <SelectValue placeholder="No Purchase Order" />
        </SelectTrigger>
        <SelectContent>
          {/* 1. Auto-match by cost code (when POs exist) */}
          {hasPurchaseOrders && (
            <SelectItem value="__auto__" className="text-muted-foreground">
              Auto-match by cost code
            </SelectItem>
          )}
          
          {/* 2. All vendor POs */}
          {hasPurchaseOrders && purchaseOrders.map((po) => {
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
          
          {/* 3. No purchase order (always last as escape hatch) */}
          <SelectItem value="__none__" className="text-muted-foreground">
            No purchase order
          </SelectItem>
        </SelectContent>
      </Select>
      
      {hasPurchaseOrders && (
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
      )}

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
 * Now always returns true since we always show the dropdown
 */
export function useShouldShowPOSelection(
  projectId: string | null | undefined,
  vendorId: string | null | undefined
): boolean {
  // Always show the PO selection column
  return true;
}
