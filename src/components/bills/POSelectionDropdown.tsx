import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useVendorPurchaseOrders, VendorPurchaseOrder } from "@/hooks/useVendorPurchaseOrders";
import { PODetailsDialog, PendingBillLine } from "./PODetailsDialog";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * Helper function to find a matching PO for a given cost code.
 * Used by parent components to auto-select PO when cost code changes.
 */
export function findMatchingPOForCostCode(
  purchaseOrders: VendorPurchaseOrder[] | undefined,
  costCodeId: string | undefined
): string | undefined {
  if (!purchaseOrders || !costCodeId) return undefined;
  // Prefer a PO that has a line matching this cost code; fall back to header match.
  const lineMatch = purchaseOrders.find(po =>
    po.line_items.some(l => l.cost_code_id === costCodeId)
  );
  if (lineMatch) return lineMatch.id;
  const headerMatch = purchaseOrders.find(po => po.cost_code_id === costCodeId);
  return headerMatch?.id;
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
  /**
   * When provided, clicking the info (ⓘ) icon calls this handler instead of
   * opening the internal PODetailsDialog. Use this to route to a shared
   * dialog (e.g. BillPOSummaryDialog) at the parent level.
   */
  onInfoClick?: () => void;
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
  onInfoClick,
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

  // When the bill line has a cost code, prefer the matching PO line for label/amount.
  const getMatchingLine = (po: VendorPurchaseOrder) =>
    costCodeId ? po.line_items.find(l => l.cost_code_id === costCodeId) : undefined;

  const getPOLabel = (po: VendorPurchaseOrder) => {
    const line = getMatchingLine(po);
    const cc = line?.cost_code ?? po.cost_code;
    const costCodeStr = cc ? `${cc.code} - ${cc.name}` : '';
    const amountStr = line
      ? `${formatCurrency(line.remaining)} / ${formatCurrency(line.amount)}`
      : `${formatCurrency(po.remaining)} / ${formatCurrency(po.total_amount)}`;
    return `${po.po_number} | ${costCodeStr} | ${amountStr}`;
  };

  const getPOCostCodeLabel = (po: VendorPurchaseOrder) => {
    const line = getMatchingLine(po);
    const cc = line?.cost_code ?? po.cost_code;
    if (!cc) return po.po_number;
    return `${cc.code}: ${cc.name}`;
  };

  // Filter POs: when costCodeId is provided, only show POs that have at least
  // one line item with that cost code (header match kept as fallback).
  const filteredPOs = (purchaseOrders || []).filter(po => {
    if (!costCodeId) return true;
    return (
      po.line_items.some(l => l.cost_code_id === costCodeId) ||
      po.cost_code_id === costCodeId
    );
  });
  const hasFilteredPOs = filteredPOs.length > 0;

  const handleChange = (val: string) => {
    if (val === '__none__') {
      onChange('__none__', undefined);
    } else if (val === '__auto__') {
      onChange('__auto__', undefined);
    } else {
      const selectedPO = purchaseOrders?.find(po => po.id === val);
      if (selectedPO && costCodeId) {
        const matchingLine = selectedPO.line_items.find(l => l.cost_code_id === costCodeId);
        onChange(val, matchingLine?.id);
      } else if (selectedPO && selectedPO.line_items.length === 1) {
        onChange(val, selectedPO.line_items[0].id);
      } else {
        onChange(val, undefined);
      }
    }
  };

  const handleInfoClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onInfoClick) {
      onInfoClick();
      return;
    }
    const poToShow = value
      ? purchaseOrders?.find(po => po.id === value)
      : filteredPOs[0] || purchaseOrders?.[0];
    if (poToShow) {
      setSelectedPOForDialog(poToShow);
      setDialogOpen(true);
    }
  };

  const selectValue = value != null && value !== '' ? value : (hasFilteredPOs ? '__auto__' : '__none__');

  const selectedPO = value && value !== '__auto__' && value !== '__none__'
    ? purchaseOrders?.find(po => po.id === value)
    : undefined;
  const triggerDisplay = selectedPO ? getPOCostCodeLabel(selectedPO) : undefined;
  const tooltipText = selectedPO ? getPOLabel(selectedPO) : undefined;

  return (
    <div className="flex items-center gap-1">
      <div className="flex flex-col gap-1 flex-1">
        <Select
          value={selectValue}
          onValueChange={handleChange}
          disabled={disabled || isLoading}
        >
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <SelectTrigger className={cn("h-8", className)}>
                  {triggerDisplay ? (
                    <span className="truncate text-left">{triggerDisplay}</span>
                  ) : (
                    <SelectValue placeholder="No Purchase Order" />
                  )}
                </SelectTrigger>
              </TooltipTrigger>
              {tooltipText && (
                <TooltipContent side="top">{tooltipText}</TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
          <SelectContent>
            {hasFilteredPOs && (
              <SelectItem value="__auto__" className="text-muted-foreground">
                Auto-match by cost code
              </SelectItem>
            )}
            
            {hasFilteredPOs && [...filteredPOs].sort((a, b) => {
              const aCode = (getMatchingLine(a)?.cost_code?.code ?? a.cost_code?.code) ?? '';
              const bCode = (getMatchingLine(b)?.cost_code?.code ?? b.cost_code?.code) ?? '';
              return aCode.localeCompare(bCode, undefined, { numeric: true });
            }).map((po) => {
              const matchingLine = getMatchingLine(po);
              const isMatchingCostCode = !!costCodeId && (
                !!matchingLine || po.cost_code_id === costCodeId
              );
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
      
      {hasFilteredPOs && (
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

      {!onInfoClick && (
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
      )}
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
