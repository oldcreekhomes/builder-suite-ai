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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Crown className="h-6 w-6 text-yellow-500" />
          Subscription
        </h2>
        <p className="text-muted-foreground mt-1">Manage your BuilderSuite subscription and billing.</p>
      </div>

      {/* Current Plan */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Current Plan
                {details?.subscription?.cancel_at_period_end && (
                  <Badge variant="destructive">Canceling</Badge>
                )}
              </CardTitle>
              <CardDescription>
                {isOnFreeTier
                  ? "You're on the free plan (up to 2 projects)"
                  : isTrialing
                    ? `Trial — ${trialDaysRemaining} day${trialDaysRemaining !== 1 ? "s" : ""} remaining`
                    : isActive
                      ? `Pro ${subscription?.billing_interval === "annual" ? "Annual" : "Monthly"}`
                      : isPastDue
                        ? "Your payment is past due — please update billing"
                        : isCanceled
                          ? "Your subscription has been canceled"
                          : "Free plan"}
              </CardDescription>
            </div>
            {statusBadge()}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {details?.subscription && (
            <div className="rounded-lg border p-4 space-y-1.5">
              <div className="font-medium">
                BuilderSuite Pro – {details.subscription.interval === "year" ? "Annual" : "Monthly"} (×
                {details.subscription.quantity})
              </div>
              <div className="text-lg font-bold">
                ${details.subscription.total_amount.toFixed(2)}{" "}
                <span className="text-sm font-normal text-muted-foreground">
                  per {details.subscription.interval === "year" ? "year" : "month"}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                {details.subscription.cancel_at_period_end ? "Access until: " : "Next billing date: "}
                {billingDate ? format(billingDate, "MMMM d, yyyy") : "—"}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <FolderOpen className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium">{projectCount}</div>
                <div className="text-xs text-muted-foreground">Projects</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Users className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium">{seatCount}</div>
                <div className="text-xs text-muted-foreground">Seats</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Free-tier upgrade path */}
      {isOnFreeTier && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Billing</CardTitle>
              <CardDescription>Upgrade to Pro to unlock unlimited projects and all features.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setShowPaywall(true)} className="gap-2">
                <Crown className="h-4 w-4" />
                Upgrade to Pro
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pricing</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="border rounded-lg p-4 text-center space-y-1">
                  <div className="text-sm font-medium text-muted-foreground">Monthly</div>
                  <div className="text-2xl font-bold">$39</div>
                  <div className="text-xs text-muted-foreground">per user / month</div>
                </div>
                <div className="border-2 border-primary rounded-lg p-4 text-center space-y-1 relative">
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                    Save 15%
                  </div>
                  <div className="text-sm font-medium text-muted-foreground">Annual</div>
                  <div className="text-2xl font-bold">$33</div>
                  <div className="text-xs text-muted-foreground">per user / month</div>
                </div>
              </div>
              <p className="text-xs text-center text-muted-foreground mt-3">
                14-day free trial. Cancel anytime.
              </p>
            </CardContent>
          </Card>
        </>
      )}

      {/* Paid-tier billing sections */}
      {hasPaidAccess && (
        <>
          {detailsLoading && (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </CardContent>
            </Card>
          )}

          {detailsError && (
            <Card>
              <CardContent className="py-8 text-center text-destructive">
                <p>Failed to load billing details.</p>
                <p className="text-sm text-muted-foreground mt-1">{(detailsError as Error).message}</p>
              </CardContent>
            </Card>
          )}

          {details && !detailsLoading && (
            <>
              {/* Payment Method */}
              <Card>
                <CardHeader>
                  <CardTitle>Payment Method</CardTitle>
                </CardHeader>
                <CardContent>
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
                    <div className="rounded-lg border p-4 flex items-center gap-3">
                      <CreditCard className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1">
                        <span className="font-medium capitalize">{details.paymentMethod.brand}</span>{" "}
                        •••• {details.paymentMethod.last4}
                      </div>
                      <span className="text-sm text-muted-foreground">
                        Expires {String(details.paymentMethod.exp_month).padStart(2, "0")}/
                        {details.paymentMethod.exp_year}
                      </span>
                      <Badge variant="outline">Default</Badge>
                      <Button variant="outline" size="sm" onClick={() => setShowUpdateCard(true)}>
                        Update
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">No payment method on file.</p>
                      <Button variant="outline" size="sm" onClick={() => setShowUpdateCard(true)}>
                        Add Card
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Billing Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Billing Information</CardTitle>
                  <CardDescription>The email address where invoices are sent each month.</CardDescription>
                </CardHeader>
                <CardContent>
                  {editingEmail ? (
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Input
                        type="email"
                        value={emailDraft}
                        onChange={(e) => setEmailDraft(e.target.value)}
                        placeholder="billing@yourcompany.com"
                        disabled={savingEmail}
                        className="flex-1"
                      />
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingEmail(false)}
                          disabled={savingEmail}
                        >
                          Cancel
                        </Button>
                        <Button size="sm" onClick={handleSaveEmail} disabled={savingEmail}>
                          {savingEmail && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg border p-4 flex items-center gap-3">
                      <Mail className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm flex-1">{details.billingEmail}</span>
                      <Button
                        variant="outline"
                        size="sm"
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
                </CardContent>
              </Card>

              {/* Invoice History */}
              <Card>
                <CardHeader>
                  <CardTitle>Invoice History</CardTitle>
                </CardHeader>
                <CardContent>
                  {details.invoices.length > 0 ? (
                    <div className="rounded-lg border divide-y">
                      {details.invoices.map((inv) => (
                        <div key={inv.id} className="flex items-center gap-2 p-3 text-sm">
                          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="text-muted-foreground text-xs shrink-0">
                            {inv.date ? format(new Date(inv.date), "MMM d, yyyy") : "—"}
                          </span>
                          <span className="font-medium shrink-0">${inv.amount.toFixed(2)}</span>
                          <span className="shrink-0">{invoiceStatusBadge(inv.status || "unknown")}</span>
                          <span className="min-w-0 flex-1 truncate text-muted-foreground text-xs">
                            {inv.description}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 shrink-0"
                            title="Download Receipt"
                            onClick={() => downloadInvoiceReceipt(inv, details.billingEmail)}
                          >
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No invoices yet.</p>
                  )}
                </CardContent>
              </Card>

              {/* Auto-renew */}
              {details.subscription && (() => {
                const isOn = !details.subscription.cancel_at_period_end;
                const disabled = canceling || reactivating;
                return (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <span id="auto-renew-label" className="text-sm font-medium">
                            Auto-renew subscription
                          </span>
                          <p className="text-xs text-muted-foreground">
                            {details.subscription.cancel_at_period_end
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
                    </CardContent>
                  </Card>
                );
              })()}
            </>
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
