import { useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Preview = {
  hasStripeSubscription: boolean;
  delta: number;
  currentQty?: number;
  newQty?: number;
  unitAmount?: number;
  interval?: string;
  newMonthly?: number;
  currentMonthly?: number;
  currentPeriodEnd?: string | null;
  card?: { brand: string; last4: string } | null;
  prorationAmount?: number | null;
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  delta: number;
  employeeName?: string;
  /** Called when the user confirms. Should perform the actual mutation. */
  onConfirm: () => Promise<void> | void;
  isConfirming?: boolean;
  /** Confirm button label override */
  confirmLabel?: string;
}

const fmtMoney = (v?: number | null) =>
  typeof v === "number"
    ? v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : "—";

const fmtDate = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })
    : "—";

export function SeatChangeConfirmDialog({
  open,
  onOpenChange,
  delta,
  employeeName,
  onConfirm,
  isConfirming,
  confirmLabel,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setPreview(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    supabase.functions
      .invoke("preview-seat-change", { body: { delta } })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setError(error.message || "Failed to load preview");
        } else if (data?.error) {
          setError(data.error);
        } else {
          setPreview(data as Preview);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, delta]);

  const isAdd = delta > 0;
  const who = employeeName?.trim() || (isAdd ? "this user" : "This employee");
  const card = preview?.card ? `${preview.card.brand} •••• ${preview.card.last4}` : "your card on file";

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{isAdd ? "Add User" : "Remove User"}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm">
              {loading && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Calculating charges…
                </div>
              )}
              {error && <div className="text-destructive">{error}</div>}

              {preview && !preview.hasStripeSubscription && (
                <div>
                  {isAdd
                    ? `${who} will be added to your company. Your subscription will reflect the change at your next billing cycle.`
                    : `${who} will lose access at the end of your billing period.`}
                </div>
              )}

              {preview?.hasStripeSubscription && isAdd && (
                <>
                  <div>
                    Adding <span className="font-medium">{who}</span> will charge{" "}
                    <span className="font-semibold">${fmtMoney(preview.prorationAmount)}</span>{" "}
                    to {card} today (prorated for the days remaining in this billing period).
                  </div>
                  <div>
                    Your monthly bill will increase from{" "}
                    <span className="font-medium">${fmtMoney(preview.currentMonthly)}/month</span>{" "}
                    to <span className="font-semibold">${fmtMoney(preview.newMonthly)}/month</span>{" "}
                    starting {fmtDate(preview.currentPeriodEnd)}.
                  </div>
                </>
              )}

              {preview?.hasStripeSubscription && !isAdd && (
                <>
                  <div>
                    <span className="font-medium">{who}</span> will keep access through{" "}
                    <span className="font-semibold">{fmtDate(preview.currentPeriodEnd)}</span>{" "}
                    (the end of your current billing period, which is already paid for). On that
                    date their access will end.
                  </div>
                  <div>
                    Your monthly bill will drop from{" "}
                    <span className="font-medium">${fmtMoney(preview.currentMonthly)}/month</span>{" "}
                    to <span className="font-semibold">${fmtMoney(preview.newMonthly)}/month</span>.
                    No refund will be issued. You can undo this anytime before{" "}
                    {fmtDate(preview.currentPeriodEnd)}.
                  </div>
                </>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isConfirming}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={loading || !!error || isConfirming}
            onClick={async (e) => {
              e.preventDefault();
              await onConfirm();
            }}
          >
            {isConfirming && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {confirmLabel ?? (isAdd ? "Confirm & Add User" : "Confirm Removal")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
