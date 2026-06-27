import { useSubscription } from "@/hooks/useSubscription";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useEffect, useState } from "react";
import { Crown, Lock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardNumberElement, CardExpiryElement, CardCvcElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { useQueryClient } from "@tanstack/react-query";
import { ManageSubscriptionDialog } from "@/components/settings/ManageSubscriptionDialog";

const stripePromise = loadStripe("pk_live_51TL5lp2M261MnJZCV9lA2C13cHAdkFVfuFZAWjQN7vLFmmikKEXhV5d8JNghePa3nNwUWfuuFiULGOhnM3cXyLY2002fDEt9S4");

interface CheckoutViewProps {
  billingInterval: "monthly" | "annual";
  seatCount: number;
  onClose: () => void;
}

function CheckoutForm({ billingInterval, seatCount, onClose }: CheckoutViewProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isAnnual = billingInterval === "annual";
  const perUser = isAnnual ? 33 : 39;
  const totalMonthly = perUser * seatCount;
  const dueToday = isAnnual ? totalMonthly * 12 : totalMonthly;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

      const { data, error: fnError } = await supabase.functions.invoke("create-subscription", {
        body: {
          billing_interval: billingInterval,
          payment_method_id: paymentMethod.id,
        },
      });

      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      toast({ title: "Subscription started!", description: "Your subscription is now active." });
      onClose();
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
    } catch (err: any) {
      console.error("Subscription error:", err);
      setError(err.message || "Failed to start subscription");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-0 rounded-xl overflow-hidden border shadow-lg bg-background">
      {/* Left: Order Summary */}
      <div className="bg-muted/50 p-6 flex flex-col gap-4 border-r">
        <h2 className="text-lg font-semibold">{isAnnual ? "Annual Plan" : "Monthly Plan"}</h2>
        <div className="border-t pt-4 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">BuilderSuite Pro</span>
            <span className="font-medium">Quantity</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">${perUser}/user/{isAnnual ? "mo (billed annually)" : "mo"}</span>
            <span className="text-muted-foreground">{seatCount}</span>
          </div>
          <div className="border-t pt-3 flex items-center justify-between text-sm">
            <span className="font-medium">Due today</span>
            <span className="font-semibold text-green-600">${dueToday.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>

      {/* Right: Card Form */}
      <div className="p-6 flex flex-col justify-center">
        <h3 className="text-sm font-medium mb-4">Payment method</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="border rounded-md p-3">
            <CardNumberElement options={{
              style: {
                base: {
                  fontSize: "16px",
                  color: "hsl(var(--foreground))",
                  "::placeholder": { color: "hsl(var(--muted-foreground))" },
                },
              },
              placeholder: "Card number",
            }} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="border rounded-md p-3">
              <CardExpiryElement options={{
                style: {
                  base: {
                    fontSize: "16px",
                    color: "hsl(var(--foreground))",
                    "::placeholder": { color: "hsl(var(--muted-foreground))" },
                  },
                },
              }} />
            </div>
            <div className="border rounded-md p-3">
              <CardCvcElement options={{
                style: {
                  base: {
                    fontSize: "16px",
                    color: "hsl(var(--foreground))",
                    "::placeholder": { color: "hsl(var(--muted-foreground))" },
                  },
                },
              }} />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={!stripe || isSubmitting} className="w-full bg-green-600 hover:bg-green-700 text-white">
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {isSubmitting ? "Processing..." : "Subscribe"}
          </Button>
        </form>
      </div>
    </div>
  );
}

interface SubscriptionGateProps {
  children: React.ReactNode;
}

export function SubscriptionGate({ children }: SubscriptionGateProps) {
  const { subscription, needsSubscription, projectCount, isLoading } = useSubscription();
  const { profile, isLoading: profileLoading } = useUserProfile();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [checkout, setCheckout] = useState<{ billingInterval: "monthly" | "annual"; seatCount: number } | null>(null);
  const [manageOpen, setManageOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const isCompanyMember = !!profile?.home_builder_id;
  const isOwner = !!profile && !profile.home_builder_id;

  // Individual lockout: user's scheduled removal date has arrived.
  const pendingRemovalAt = (profile as any)?.pending_removal_at
    ? new Date((profile as any).pending_removal_at as string)
    : null;
  const isPersonallyLockedOut =
    !(profile as any)?.access_revoked &&
    pendingRemovalAt !== null &&
    pendingRemovalAt.getTime() <= Date.now();

  // Company-wide lockout: payment failed, unpaid, or fully canceled past period end.
  const status = subscription?.status;
  const periodEnd = subscription?.current_period_end
    ? new Date(subscription.current_period_end)
    : null;
  const isCompanyLockedOut =
    !!subscription &&
    (status === "past_due" ||
      status === "unpaid" ||
      (status === "canceled" && (!periodEnd || periodEnd.getTime() < Date.now())));

  // Poll while locked out so the gate releases instantly after payment is fixed.
  useEffect(() => {
    if (!isCompanyLockedOut && !isPersonallyLockedOut) return;
    const id = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    }, 30_000);
    return () => clearInterval(id);
  }, [isCompanyLockedOut, isPersonallyLockedOut, queryClient]);

  // (Billing portal removed — subscription management is fully in-app via ManageSubscriptionDialog.)

  const handleSelectPlan = async (billing_interval: "monthly" | "annual") => {
    setLoadingPlan(billing_interval);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout-session", {
        body: { billing_interval },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setCheckout({
        billingInterval: billing_interval,
        seatCount: data.seatCount || 1,
      });
    } catch (err: any) {
      console.error("Error:", err);
      toast({ title: "Error", description: err.message || "Failed to load checkout", variant: "destructive" });
    } finally {
      setLoadingPlan(null);
    }
  };

  if (isLoading || profileLoading) return <>{children}</>;

  if (isPersonallyLockedOut) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-6">
        <div className="max-w-md w-full text-center space-y-5">
          <div className="mx-auto w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
            <Lock className="h-8 w-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold">Your access has ended</h1>
          <p className="text-muted-foreground">
            Your account owner removed you from this company. Please contact them if you believe this is a mistake.
          </p>
        </div>
      </div>
    );
  }

  if (isCompanyLockedOut) {
    const reason =
      status === "past_due" || status === "unpaid"
        ? "Payment failed. Your company's access has been suspended."
        : "Your company's subscription has ended.";
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-6">
        <div className="max-w-md w-full text-center space-y-5">
          <div className="mx-auto w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
            <Lock className="h-8 w-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold">Access suspended</h1>
          <p className="text-muted-foreground">{reason}</p>
          {isOwner ? (
            <>
              <p className="text-sm text-muted-foreground">
                Update your payment method to restore access immediately for you and your team.
              </p>
              <Button onClick={() => setManageOpen(true)} className="w-full">
                Update Payment Method
              </Button>
              <ManageSubscriptionDialog open={manageOpen} onOpenChange={setManageOpen} />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Please contact your account owner to resolve the payment issue. Access will restore automatically once it's fixed.
            </p>
          )}
        </div>
      </div>
    );
  }

  if (isCompanyMember) return <>{children}</>;

  if (needsSubscription) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-6">
        <div className="max-w-lg w-full text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
            <Lock className="h-8 w-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold">Subscription Required</h1>
          <p className="text-muted-foreground">
            You have {projectCount} projects, which exceeds the free tier limit of 3. Please subscribe to continue using BuilderSuite.
          </p>
          <div className="flex justify-center pt-2">
            <div className="border-2 border-primary rounded-lg p-5 flex flex-col items-center w-full max-w-xs">
              <div className="text-sm font-medium text-muted-foreground">Subscribe</div>
              <div className="text-2xl font-bold mt-2">$39</div>
              <div className="text-xs text-muted-foreground mt-1">per user / month</div>
              <div className="w-full mt-4">
                <Button onClick={() => handleSelectPlan("monthly")} disabled={!!loadingPlan} className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white">
                  {loadingPlan === "monthly" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crown className="h-4 w-4" />}
                  {loadingPlan === "monthly" ? "Loading..." : "Subscribe"}
                </Button>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Cancel anytime from your account settings.</p>
        </div>

        <Dialog open={!!checkout} onOpenChange={(open) => { if (!open) setCheckout(null); }}>
          <DialogContent className="max-w-[700px] p-0 gap-0">
            <VisuallyHidden>
              <DialogTitle>Checkout</DialogTitle>
            </VisuallyHidden>
            {checkout && (
              <Elements stripe={stripePromise}>
                <CheckoutForm
                  billingInterval={checkout.billingInterval}
                  seatCount={checkout.seatCount}
                  onClose={() => setCheckout(null)}
                />
              </Elements>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return <>{children}</>;
}
