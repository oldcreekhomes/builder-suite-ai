import { useState } from "react";
import { useSubscription } from "@/hooks/useSubscription";
import { useUserRole } from "@/hooks/useUserRole";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
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
import { PaywallDialog } from "@/components/PaywallDialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Crown,
  Users,
  FolderOpen,
  Calendar,
  Loader2,
  CreditCard,
  Mail,
  FileText,
  Download,
  AlertTriangle,
  Pencil,
} from "lucide-react";
import { format, addDays } from "date-fns";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { pdf } from "@react-pdf/renderer";
import { SubscriptionInvoicePdfDocument } from "./pdf/SubscriptionInvoicePdfDocument";

const stripePromise = loadStripe(
  "pk_live_51TL5lp2M261MnJZCV9lA2C13cHAdkFVfuFZAWjQN7vLFmmikKEXhV5d8JNghePa3nNwUWfuuFiULGOhnM3cXyLY2002fDEt9S4"
);

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

function getNextBillingDate(sub: SubscriptionDetails["subscription"]): Date | null {
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
      const { error: pmError, paymentMethod } = await stripe.createPaymentMethod({
        type: "card",
        card: cardElement,
      });
      if (pmError) throw new Error(pmError.message);
      const { data, error: fnError } = await supabase.functions.invoke(
        "update-payment-method",
        { body: { payment_method_id: paymentMethod.id } }
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
        <CardNumberElement options={{ style: elementStyle, placeholder: "Card number" }} />
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
        <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={isSubmitting || !stripe}>
          {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
          Update Card
        </Button>
      </div>
    </form>
  );
}

const PAID_GREEN_BG = "bg-[#dcfce7] dark:bg-green-900/30";
const invoiceStatusBadge = (status: string) => {
  switch (status) {
    case "paid":
      return <Badge className={`${PAID_GREEN_BG} text-green-800 dark:text-green-400`}>Paid</Badge>;
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

export function SubscriptionTab() {
  const {
    subscription,
    status,
    isOnFreeTier,
    isTrialing,
    isActive,
    isPastDue,
    isCanceled,
    trialDaysRemaining,
    projectCount,
    ownerId,
  } = useSubscription();
  const { isOwner } = useUserRole();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showPaywall, setShowPaywall] = useState(false);
  const [showUpdateCard, setShowUpdateCard] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);
  const [emailDraft, setEmailDraft] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [reactivating, setReactivating] = useState(false);

  const { data: seatCount = 1 } = useQuery({
    queryKey: ["seat-count", ownerId],
    queryFn: async () => {
      if (!ownerId) return 1;
      const { count } = await supabase
        .from("users")
        .select("id", { count: "exact", head: true })
        .eq("home_builder_id", ownerId)
        .eq("confirmed", true)
        .eq("access_revoked", false);
      return 1 + (count || 0);
    },
    enabled: !!ownerId,
  });

  const hasPaidAccess = isActive || isTrialing || isPastDue || isCanceled;

  const { data: details, isLoading: detailsLoading, error: detailsError } = useQuery<SubscriptionDetails>({
    queryKey: ["subscription-details"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("get-subscription-details");
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    enabled: isOwner && hasPaidAccess,
  });

  const billingDate = details?.subscription ? getNextBillingDate(details.subscription) : null;

  const handleCancel = async () => {
    if (!details?.subscription?.id) return;
    setCanceling(true);
    try {
      const { data: result, error } = await supabase.functions.invoke("cancel-subscription", {
        body: { subscription_id: details.subscription.id },
      });
      if (error) throw error;
      if (result?.error) throw new Error(result.error);
      toast({
        title: "Subscription canceled",
        description: billingDate
          ? `Your subscription will remain active until ${format(billingDate, "MMM d, yyyy")}.`
          : "Your subscription will remain active until the end of the billing period.",
      });
      queryClient.invalidateQueries({ queryKey: ["subscription-details"] });
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
      setCancelDialogOpen(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to cancel subscription", variant: "destructive" });
    } finally {
      setCanceling(false);
    }
  };

  const handleReactivate = async () => {
    if (!details?.subscription?.id) return;
    setReactivating(true);
    try {
      const { data: result, error } = await supabase.functions.invoke("reactivate-subscription", {
        body: { subscription_id: details.subscription.id },
      });
      if (error) throw error;
      if (result?.error) throw new Error(result.error);
      toast({ title: "Subscription reactivated", description: "Your subscription will continue to auto-renew." });
      queryClient.invalidateQueries({ queryKey: ["subscription-details"] });
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to reactivate subscription", variant: "destructive" });
    } finally {
      setReactivating(false);
    }
  };

  const handleSaveEmail = async () => {
    const trimmed = emailDraft.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast({ title: "Invalid email", description: "Please enter a valid email address.", variant: "destructive" });
      return;
    }
    setSavingEmail(true);
    try {
      const { data, error } = await supabase.functions.invoke("update-billing-email", {
        body: { email: trimmed },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Billing email updated", description: "Future invoices will be sent here." });
      setEditingEmail(false);
      queryClient.invalidateQueries({ queryKey: ["subscription-details"] });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to update billing email", variant: "destructive" });
    } finally {
      setSavingEmail(false);
    }
  };

  const statusBadge = () => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Active</Badge>;
      case "trialing":
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">Trial</Badge>;
      case "past_due":
        return <Badge variant="destructive">Past Due</Badge>;
      case "canceled":
        return <Badge variant="secondary">Canceled</Badge>;
      default:
        return <Badge variant="outline">Free</Badge>;
    }
  };

  if (!isOwner) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Subscription</CardTitle>
          <CardDescription>Subscription management is only available to the account owner.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const SectionLabel = ({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) => (
    <div className="flex items-center justify-between mb-2">
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{children}</div>
      {right}
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-yellow-500" />
          <h2 className="text-lg font-bold">Subscription</h2>
          {statusBadge()}
          {details?.subscription?.cancel_at_period_end && (
            <Badge variant="destructive">Canceling</Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">Manage your BuilderSuite subscription and billing.</p>
      </div>

      {/* Free-tier upgrade path */}
      {isOnFreeTier && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="rounded-lg border p-3">
            <SectionLabel>Billing</SectionLabel>
            <p className="text-xs text-muted-foreground mb-2">
              Upgrade to Pro to unlock unlimited projects and all features.
            </p>
            <Button onClick={() => setShowPaywall(true)} size="sm" className="gap-2">
              <Crown className="h-4 w-4" />
              Upgrade to Pro
            </Button>
          </div>
          <div className="rounded-lg border p-3">
            <SectionLabel>Pricing</SectionLabel>
            <div className="grid grid-cols-2 gap-2">
              <div className="border rounded-md p-2 text-center">
                <div className="text-xs text-muted-foreground">Monthly</div>
                <div className="text-lg font-bold">$39</div>
                <div className="text-[10px] text-muted-foreground">per user / month</div>
              </div>
              <div className="border-2 border-primary rounded-md p-2 text-center relative">
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full">
                  Save 15%
                </div>
                <div className="text-xs text-muted-foreground">Annual</div>
                <div className="text-lg font-bold">$33</div>
                <div className="text-[10px] text-muted-foreground">per user / month</div>
              </div>
            </div>
            <p className="text-[10px] text-center text-muted-foreground mt-2">
              14-day free trial. Cancel anytime.
            </p>
          </div>
        </div>
      )}

      {/* Paid-tier billing sections */}
      {hasPaidAccess && (
        <>
          {detailsLoading && (
            <div className="rounded-lg border flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {detailsError && (
            <div className="rounded-lg border py-4 text-center text-destructive">
              <p className="text-sm">Failed to load billing details.</p>
              <p className="text-xs text-muted-foreground mt-1">{(detailsError as Error).message}</p>
            </div>
          )}

          {details && !detailsLoading && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {/* LEFT COLUMN */}
              <div className="space-y-3">
                {/* Current Plan */}
                <div className="rounded-lg border p-3">
                  <SectionLabel>Current Plan</SectionLabel>
                  {details.subscription && (
                    <>
                      <div className="flex items-baseline flex-wrap gap-x-2 gap-y-1">
                        <span className="font-medium text-sm">
                          BuilderSuite Pro – {details.subscription.interval === "year" ? "Annual" : "Monthly"} (×
                          {details.subscription.quantity})
                        </span>
                        <span className="text-base font-bold">
                          ${details.subscription.total_amount.toFixed(2)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          /{details.subscription.interval === "year" ? "yr" : "mo"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                        <Calendar className="h-3 w-3" />
                        {details.subscription.cancel_at_period_end ? "Access until " : "Next billing "}
                        {billingDate ? format(billingDate, "MMM d, yyyy") : "—"}
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-xs">
                        <div className="flex items-center gap-1.5">
                          <FolderOpen className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="font-medium">{projectCount}</span>
                          <span className="text-muted-foreground">Projects</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="font-medium">{seatCount}</span>
                          <span className="text-muted-foreground">Seats</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Auto-renew */}
                {details.subscription && (() => {
                  const isOn = !details.subscription.cancel_at_period_end;
                  const disabled = canceling || reactivating;
                  return (
                    <div className="rounded-lg border p-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div id="auto-renew-label" className="text-sm font-medium">Auto-renew subscription</div>
                        <p className="text-xs text-muted-foreground truncate">
                          {details.subscription.cancel_at_period_end
                            ? `Cancels ${billingDate ? format(billingDate, "MMM d, yyyy") : "at period end"}`
                            : "Subscription will automatically renew"}
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
                          if (isOn) setCancelDialogOpen(true);
                          else handleReactivate();
                        }}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full p-[3px] overflow-hidden transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 ${
                          isOn ? "bg-black" : "bg-input"
                        }`}
                      >
                        <span
                          className={`pointer-events-none block h-[18px] w-[18px] rounded-full bg-white shadow-sm ring-0 transition-transform ${
                            isOn ? "translate-x-[20px]" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>
                  );
                })()}
              </div>

              {/* RIGHT COLUMN */}
              <div className="space-y-3">
                {/* Payment Method */}
                <div className="rounded-lg border p-3">
                  <SectionLabel>Payment Method</SectionLabel>
                  {showUpdateCard ? (
                    <Elements stripe={stripePromise}>
                      <UpdatePaymentForm
                        onSuccess={() => {
                          setShowUpdateCard(false);
                          queryClient.invalidateQueries({ queryKey: ["subscription-details"] });
                        }}
                        onCancel={() => setShowUpdateCard(false)}
                      />
                    </Elements>
                  ) : details.paymentMethod ? (
                    <div className="flex items-center gap-2 text-sm">
                      <CreditCard className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="font-medium capitalize">{details.paymentMethod.brand}</span>
                      <span>•••• {details.paymentMethod.last4}</span>
                      <span className="text-xs text-muted-foreground">
                        Exp {String(details.paymentMethod.exp_month).padStart(2, "0")}/
                        {details.paymentMethod.exp_year}
                      </span>
                      <Badge variant="outline" className="text-[10px] py-0 px-1.5">Default</Badge>
                      <Button variant="outline" size="sm" className="ml-auto h-7" onClick={() => setShowUpdateCard(true)}>
                        Update
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">No payment method on file.</span>
                      <Button variant="outline" size="sm" className="h-7" onClick={() => setShowUpdateCard(true)}>
                        Add Card
                      </Button>
                    </div>
                  )}
                </div>

                {/* Billing Information */}
                <div className="rounded-lg border p-3">
                  <SectionLabel>Billing Information</SectionLabel>
                  {editingEmail ? (
                    <div className="flex gap-2">
                      <Input
                        type="email"
                        value={emailDraft}
                        onChange={(e) => setEmailDraft(e.target.value)}
                        placeholder="billing@yourcompany.com"
                        disabled={savingEmail}
                        className="flex-1 h-8"
                      />
                      <Button variant="outline" size="sm" className="h-8" onClick={() => setEditingEmail(false)} disabled={savingEmail}>
                        Cancel
                      </Button>
                      <Button size="sm" className="h-8" onClick={handleSaveEmail} disabled={savingEmail}>
                        {savingEmail && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
                        Save
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm" title="Invoices are sent to this email each month">
                      <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="flex-1 truncate">{details.billingEmail}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7"
                        onClick={() => {
                          setEmailDraft(details.billingEmail);
                          setEditingEmail(true);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5 mr-1.5" />
                        Edit
                      </Button>
                    </div>
                  )}
                </div>

                {/* Invoice History */}
                <div className="rounded-lg border p-3">
                  <SectionLabel>Invoice History</SectionLabel>
                  {details.invoices.length > 0 ? (
                    <div className="max-h-40 overflow-y-auto divide-y">
                      {details.invoices.map((inv) => (
                        <div key={inv.id} className="flex items-center gap-2 py-1.5 text-xs">
                          <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="text-muted-foreground shrink-0">
                            {inv.date ? format(new Date(inv.date), "MMM d, yyyy") : "—"}
                          </span>
                          <span className="font-medium shrink-0">${inv.amount.toFixed(2)}</span>
                          <span className="shrink-0">{invoiceStatusBadge(inv.status || "unknown")}</span>
                          <span className="min-w-0 flex-1 truncate text-muted-foreground">
                            {inv.description}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0"
                            title="Download Receipt"
                            onClick={() => downloadInvoiceReceipt(inv, details.billingEmail)}
                          >
                            <Download className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No invoices yet.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}


      <PaywallDialog open={showPaywall} onOpenChange={setShowPaywall} projectCount={projectCount} />

      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Cancel Subscription
            </AlertDialogTitle>
            <AlertDialogDescription>
              Your subscription will remain active until{" "}
              {billingDate ? format(billingDate, "MMMM d, yyyy") : "the end of the billing period"}.
              After that, you'll be limited to 3 free projects.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              disabled={canceling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {canceling && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Yes, Cancel
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
