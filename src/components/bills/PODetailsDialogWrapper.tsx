import { PODetailsDialog } from "./PODetailsDialog";
import { useVendorPurchaseOrders } from "@/hooks/useVendorPurchaseOrders";
import { POMatch } from "@/hooks/useBillPOMatching";

interface PODetailsDialogWrapperProps {
  poDialogState: {
    open: boolean;
    poMatch: POMatch | null;
    bill: { project_id?: string | null; vendor_id?: string; total_amount?: number; reference_number?: string | null } | null;
  };
  onClose: () => void;
}

export function PODetailsDialogWrapper({ poDialogState, onClose }: PODetailsDialogWrapperProps) {
  const { data: vendorPOs } = useVendorPurchaseOrders(
    poDialogState.bill?.project_id,
    poDialogState.bill?.vendor_id
  );

  const matchedPO = vendorPOs?.find(po => po.id === poDialogState.poMatch?.po_id) || null;

  return (
    <PODetailsDialog
      open={poDialogState.open}
      onOpenChange={(open) => { if (!open) onClose(); }}
      purchaseOrder={matchedPO}
      projectId={poDialogState.bill?.project_id || null}
      vendorId={poDialogState.bill?.vendor_id || null}
      currentBillAmount={poDialogState.bill?.total_amount}
      currentBillReference={poDialogState.bill?.reference_number || undefined}
    />
  );
}
