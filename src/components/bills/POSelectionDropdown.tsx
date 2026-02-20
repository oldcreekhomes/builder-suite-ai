import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useVendorPurchaseOrders, VendorPurchaseOrder } from "@/hooks/useVendorPurchaseOrders";
import { PODetailsDialog, PendingBillLine } from "./PODetailsDialog";
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

/**
 * Find a matching PO line for a given cost code within a specific PO.
 */
export function findMatchingPOLineForCostCode(
  purchaseOrders: VendorPurchaseOrder[] | undefined,
  poId: string | undefined,
  costCodeId: string | undefined
): string | undefined {
  if (!purchaseOrders || !poId || !costCodeId) return undefined;
  const po = purchaseOrders.find(p => p.id === poId);
  if (!po) return undefined;
  const match = po.line_items.find(l => l.cost_code_id === costCodeId);
  return match?.id;
}

interface POSelectionDropdownProps {
  projectId: string | null | undefined;
  vendorId: string | null | undefined;
  value: string | undefined;
  onChange: (poId: string | undefined, poLineId?: string | undefined) => void;
  costCodeId?: string;
  className?: string;
  disabled?: boolean;
  purchaseOrderLineId?: string;
  currentBillId?: string;
  currentBillAmount?: number;
  currentBillReference?: string;
  pendingBillLines?: PendingBillLine[];
}

/**
 * Dropdown to select a specific Purchase Order for a bill line.
 * When a PO with multiple lines is selected, shows a secondary dropdown for line selection.
 */
export function POSelectionDropdown({
  projectId,
  vendorId,
  value,
  onChange,
  costCodeId,
  className,
  disabled = false,
  purchaseOrderLineId,
  currentBillId,
  currentBillAmount,
  currentBillReference,
  pendingBillLines,
}: POSelectionDropdownProps) {
  const { data: purchaseOrders, isLoading } = useVendorPurchaseOrders(projectId, vendorId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPOForDialog, setSelectedPOForDialog] = useState<VendorPurchaseOrder | null>(null);

  const hasPurchaseOrders = purchaseOrders && purchaseOrders.length > 0;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
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
      onChange('__none__', undefined);
    } else if (val === '__auto__') {
      onChange('__auto__', undefined);
    } else {
      // Check if this PO has exactly one line item — auto-assign it
      const selectedPO = purchaseOrders?.find(po => po.id === val);
      if (selectedPO && selectedPO.line_items.length === 1) {
        onChange(val, selectedPO.line_items[0].id);
      } else if (selectedPO && costCodeId) {
        // Try to auto-match line by cost code
        const matchingLine = selectedPO.line_items.find(l => l.cost_code_id === costCodeId);
        onChange(val, matchingLine?.id);
      } else {
        onChange(val, undefined);
      }
    }
  };

  const handleInfoClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const poToShow = value 
      ? purchaseOrders?.find(po => po.id === value) 
      : purchaseOrders?.[0];
    if (poToShow) {
      setSelectedPOForDialog(poToShow);
      setDialogOpen(true);
    }
  };

  const selectValue = value != null && value !== '' ? value : (hasPurchaseOrders ? '__auto__' : '__none__');

  return (
    <div className="flex items-center gap-1">
      <div className="flex flex-col gap-1 flex-1">
        <Select
          value={selectValue}
          onValueChange={handleChange}
          disabled={disabled || isLoading}
        >
          <SelectTrigger className={cn("h-8", className)}>
            <SelectValue placeholder="No Purchase Order" />
          </SelectTrigger>
          <SelectContent>
            {hasPurchaseOrders && (
              <SelectItem value="__auto__" className="text-muted-foreground">
                Auto-match by cost code
              </SelectItem>
            )}
            
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
            
            <SelectItem value="__none__" className="text-muted-foreground">
              No purchase order
            </SelectItem>
          </SelectContent>
        </Select>

      </div>
      
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
        currentBillId={currentBillId}
        currentBillAmount={currentBillAmount}
        currentBillReference={currentBillReference}
        pendingBillLines={pendingBillLines}
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
  return true;
}
