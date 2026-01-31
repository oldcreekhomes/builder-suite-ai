import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useVendorPurchaseOrders, VendorPurchaseOrder } from "@/hooks/useVendorPurchaseOrders";
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
 * Shows PO number, cost code, and remaining balance.
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
    const costCodeStr = po.cost_code ? `${po.cost_code.code}` : '';
    const remainingStr = formatCurrency(po.remaining);
    return `${po.po_number} | ${costCodeStr} | ${remainingStr} remaining`;
  };

  const handleChange = (val: string) => {
    if (val === '__auto__') {
      onChange(undefined);
    } else {
      onChange(val);
    }
  };

  return (
    <Select
      value={value || '__auto__'}
      onValueChange={handleChange}
      disabled={disabled || isLoading}
    >
      <SelectTrigger className={cn("h-8", className)}>
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
