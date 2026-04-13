import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, addDays } from "date-fns";
import {
  CreditCard,
  Mail,
  FileText,
  Download,
  Loader2,
  Calendar,
  Crown,
  AlertTriangle,
} from "lucide-react";

import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

const stripePromise = loadStripe(
  "pk_test_51TL5mD2OJCoyD632I78ZLOABNArQ3j0vjFOIDJxojGuktR4wIGPZeq5HDRlyjtPqNruAa7HDRRQWTmA6N1aKFHck00850Qmh79"
);

interface ManageSubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SubscriptionDetails {
  subscription: {
    id: string;
    status: string;
    plan_name: string;
    interval: string;
    quantity: number;
    unit_amount: number;
    total_amount: number;
    current_period_start: string | null;
    current_period_end: string | null;
    cancel_at_period_end: boolean;
    created: string | null;
  } | null;
  paymentMethod: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  } | null;
  billingEmail: string;
  invoices: Array<{
    id: string;
    date: string;
    amount: number;
    status: string;
    description: string;
    invoice_pdf: string | null;
  }>;
}

/** Get the next billing date with robust fallbacks */
function getNextBillingDate(
  sub: SubscriptionDetails["subscription"]
): Date | null {
  if (!sub) return null;

  if (sub.current_period_end) {
    const d = new Date(sub.current_period_end);
    if (!isNaN(d.getTime()) && d.getTime() > 0) return d;
  }

  if (sub.current_period_start) {
    const start = new Date(sub.current_period_start);
    if (!isNaN(start.getTime()) && start.getTime() > 0) {
      return addDays(start, sub.interval === "year" ? 365 : 30);
    }
  }

  if (sub.created) {
    const created = new Date(sub.created);
    if (!isNaN(created.getTime()) && created.getTime() > 0) {
      return addDays(created, sub.interval === "year" ? 365 : 30);
    }
  }

  return addDays(new Date(), 30);
}

import { pdf } from "@react-pdf/renderer";
import { SubscriptionInvoicePdfDocument } from "./pdf/SubscriptionInvoicePdfDocument";

/** Generate and download a receipt as a locally-rendered PDF */
async function downloadInvoiceReceipt(
  invoice: SubscriptionDetails["invoices"][0],
  billingEmail: string
) {
  const blob = await pdf(
    <SubscriptionInvoicePdfDocument invoice={invoice} billingEmail={billingEmail} />
  ).toBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `Invoice_${invoice.id}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ── Update Payment Method Form (inside Elements provider) ──
function UpdatePaymentForm({
  onSuccess,
  onCancel,
}: {
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!stripe || !elements) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const cardElement = elements.getElement(CardNumberElement);
      if (!cardElement) throw new Error("Card element not found");

      const { error: pmError, paymentMethod } =
        await stripe.createPaymentMethod({
          type: "card",
          card: cardElement,
        });

      if (pmError) throw new Error(pmError.message);

      const { data, error: fnError } = await supabase.functions.invoke(
        "update-payment-method",
        {
          body: { payment_method_id: paymentMethod.id },
        }
      );

      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      toast({
        title: "Payment method updated",
        description: "Your card has been updated successfully.",
      });
      onSuccess();
    } catch (err: any) {
      console.error("Update payment error:", err);
      setError(err.message || "Failed to update payment method");
    } finally {
      setIsSubmitting(false);
    }
  };

  const elementStyle = {
    base: {
      fontSize: "16px",
      color: "hsl(var(--foreground))",
      "::placeholder": { color: "hsl(var(--muted-foreground))" },
    },
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="border rounded-md p-3">
        <CardNumberElement
          options={{ style: elementStyle, placeholder: "Card number" }}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="border rounded-md p-3">
          <CardExpiryElement options={{ style: elementStyle }} />
        </div>
        <div className="border rounded-md p-3">
          <CardCvcElement options={{ style: elementStyle }} />
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2 justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={isSubmitting || !stripe}>
          {isSubmitting && (
            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
          )}
          Update Card
        </Button>
      </div>
    </form>
  );
}

export function ManageSubscriptionDialog({
  open,
  onOpenChange,
}: ManageSubscriptionDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [reactivating, setReactivating] = useState(false);
  const [showUpdateCard, setShowUpdateCard] = useState(false);

  const { data, isLoading, error } = useQuery<SubscriptionDetails>({
    queryKey: ["subscription-details"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke(
        "get-subscription-details"
      );
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    enabled: open,
  });

  const handleCancel = async () => {
    if (!data?.subscription?.id) return;
    setCanceling(true);
    try {
      const { data: result, error } = await supabase.functions.invoke(
        "cancel-subscription",
        { body: { subscription_id: data.subscription.id } }
      );
      if (error) throw error;
      if (result?.error) throw new Error(result.error);

      const billingDate = getNextBillingDate(data.subscription);
      toast({
        title: "Subscription canceled",
        description: billingDate
          ? `Your subscription will remain active until ${format(billingDate, "MMM d, yyyy")}.`
          : "Your subscription will remain active until the end of the billing period.",
      });
      queryClient.invalidateQueries({ queryKey: ["subscription-details"] });
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
      setCancelDialogOpen(false);
      onOpenChange(false);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to cancel subscription",
        variant: "destructive",
      });
    } finally {
      setCanceling(false);
    }
  };

  const handleReactivate = async () => {
    if (!data?.subscription?.id) return;
    setReactivating(true);
    try {
      const { data: result, error } = await supabase.functions.invoke(
        "reactivate-subscription",
        { body: { subscription_id: data.subscription.id } }
      );
      if (error) throw error;
      if (result?.error) throw new Error(result.error);

      toast({
        title: "Subscription reactivated",
        description: "Your subscription will continue to auto-renew.",
      });
      queryClient.invalidateQueries({ queryKey: ["subscription-details"] });
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to reactivate subscription",
        variant: "destructive",
      });
    } finally {
      setReactivating(false);
    }
  };

  const PAID_GREEN_BG = "bg-[#dcfce7] dark:bg-green-900/30";

  const invoiceStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return (
          <Badge className={`${PAID_GREEN_BG} text-green-800 dark:text-green-400`}>
            Paid
          </Badge>
        );
      case "open":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
            Open
          </Badge>
        );
      case "void":
        return <Badge variant="secondary">Void</Badge>;
      case "uncollectible":
        return <Badge variant="destructive">Uncollectible</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const billingDate = data?.subscription
    ? getNextBillingDate(data.subscription)
    : null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-yellow-500" />
              Manage Subscription
            </DialogTitle>
          </DialogHeader>

          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {error && (
            <div className="text-center py-8 text-destructive">
              <p>Failed to load subscription details.</p>
              <p className="text-sm text-muted-foreground mt-1">
                {(error as Error).message}
              </p>
            </div>
          )}

          {data && !isLoading && (
            <div className="space-y-5">
              {/* Current Subscription */}
              {data.subscription && (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Current Subscription
                  </h3>
                  <div className="rounded-lg border p-4 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">
                        BuilderSuite Pro –{" "}
                        {data.subscription.interval === "year"
                          ? "Annual"
                          : "Monthly"}{" "}
                        (×{data.subscription.quantity})
                      </span>
                      {data.subscription.cancel_at_period_end && (
                        <Badge variant="destructive">Canceling</Badge>
                      )}
                    </div>
                    <div className="text-lg font-bold">
                      ${data.subscription.total_amount.toFixed(2)}{" "}
                      <span className="text-sm font-normal text-muted-foreground">
                        per{" "}
                        {data.subscription.interval === "year"
                          ? "year"
                          : "month"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      {data.subscription.cancel_at_period_end
                        ? "Access until: "
                        : "Next billing date: "}
                      {billingDate
                        ? format(billingDate, "MMMM d, yyyy")
                        : "—"}
                    </div>
                  </div>
                </div>
              )}

              <Separator />

              {/* Payment Method */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Payment Method
                </h3>
                {showUpdateCard ? (
                  <div className="rounded-lg border p-4">
                    <Elements stripe={stripePromise}>
                      <UpdatePaymentForm
                        onSuccess={() => {
                          setShowUpdateCard(false);
                          queryClient.invalidateQueries({
                            queryKey: ["subscription-details"],
                          });
                        }}
                        onCancel={() => setShowUpdateCard(false)}
                      />
                    </Elements>
                  </div>
                ) : data.paymentMethod ? (
                  <div className="rounded-lg border p-4 flex items-center gap-3">
                    <CreditCard className="h-5 w-5 text-muted-foreground" />
                    <div className="flex-1">
                      <span className="font-medium capitalize">
                        {data.paymentMethod.brand}
                      </span>{" "}
                      •••• {data.paymentMethod.last4}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      Expires{" "}
                      {String(data.paymentMethod.exp_month).padStart(2, "0")}/
                      {data.paymentMethod.exp_year}
                    </span>
                    <Badge variant="outline">Default</Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowUpdateCard(true)}
                    >
                      Update
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No payment method on file.
                  </p>
                )}
              </div>

              <Separator />

              {/* Billing Information */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Billing Information
                </h3>
                <div className="rounded-lg border p-4 flex items-center gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm">{data.billingEmail}</span>
                </div>
              </div>

              <Separator />

              {/* Invoice History */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Invoice History
                </h3>
                {data.invoices.length > 0 ? (
                  <div className="rounded-lg border divide-y">
                    {data.invoices.map((inv) => (
                      <div
                        key={inv.id}
                        className="flex items-center gap-2 p-3 text-sm"
                      >
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-muted-foreground text-xs shrink-0">
                          {inv.date
                            ? format(new Date(inv.date), "MMM d, yyyy")
                            : "—"}
                        </span>
                        <span className="font-medium shrink-0">
                          ${inv.amount.toFixed(2)}
                        </span>
                        <span className="shrink-0">
                          {invoiceStatusBadge(inv.status || "unknown")}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-muted-foreground text-xs">
                          {inv.description}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0"
                          title="Download Receipt"
                          onClick={() =>
                            downloadInvoiceReceipt(inv, data.billingEmail)
                          }
                        >
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No invoices yet.
                  </p>
                )}
              </div>

              {/* Auto-renew toggle */}
              {data.subscription && (() => {
                const isOn = !data.subscription.cancel_at_period_end;
                const disabled = canceling || reactivating;
                return (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <span id="auto-renew-label" className="text-sm font-medium">
                            Auto-renew subscription
                          </span>
                          <p className="text-xs text-muted-foreground">
                            {data.subscription!.cancel_at_period_end
                              ? `Your subscription will cancel on ${billingDate ? format(billingDate, "MMMM d, yyyy") : "the end of the billing period"}`
                              : "Your subscription will automatically renew"}
                          </p>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={isOn}
                          aria-labelledby="auto-renew-label"
                          disabled={disabled}
                          onClick={() => {
                            if (disabled) return;
                            if (isOn) {
                              setCancelDialogOpen(true);
                            } else {
                              handleReactivate();
                            }
                          }}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full p-[3px] overflow-hidden transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 ${
                            isOn
                              ? "bg-[#dcfce7] dark:bg-green-900/30"
                              : "bg-input"
                          }`}
                        >
                          <span
                            className={`pointer-events-none block h-[18px] w-[18px] rounded-full bg-white shadow-sm ring-0 transition-transform ${
                              isOn ? "translate-x-[20px]" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Cancel Subscription
            </AlertDialogTitle>
            <AlertDialogDescription>
              Your subscription will remain active until{" "}
              {billingDate
                ? format(billingDate, "MMMM d, yyyy")
                : "the end of the billing period"}
              . After that, you'll be limited to 3 free projects.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              disabled={canceling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {canceling && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              Yes, Cancel
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
