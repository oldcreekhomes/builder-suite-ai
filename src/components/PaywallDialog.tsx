import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Check, Crown, ArrowLeft, Loader2 } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardNumberElement, CardExpiryElement, CardCvcElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { useQueryClient } from "@tanstack/react-query";

const stripePromise = loadStripe("pk_test_51TL5mD2OJCoyD632I78ZLOABNArQ3j0vjFOIDJxojGuktR4wIGPZeq5HDRlyjtPqNruAa7HDRRQWTmA6N1aKFHck00850Qmh79");

interface PaywallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectCount: number;
}

interface CheckoutState {
  billingInterval: "monthly" | "annual";
  seatCount: number;
}

const features = [
  "Unlimited projects",
  "Full accounting suite",
  "AI bill management",
  "Bid management & marketplace",
  "Gantt scheduling",
  "Document management",
  "Team communication",
];

function CheckoutCardForm({ billingInterval, seatCount, onBack, onSuccess }: {
  billingInterval: "monthly" | "annual";
  seatCount: number;
  onBack: () => void;
  onSuccess: () => void;
}) {
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
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
      onSuccess();
    } catch (err: any) {
      console.error("Subscription error:", err);
      setError(err.message || "Failed to start subscription");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="p-3 border-b">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1 text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2">
        <div className="bg-muted/50 p-5 flex flex-col gap-3 border-r">
          <h2 className="text-base font-semibold">{isAnnual ? "Annual Plan" : "Monthly Plan"}</h2>
          <div className="border-t pt-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium">BuilderSuite Pro</span>
              <span className="font-medium">Quantity</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">${perUser}/user/{isAnnual ? "mo (billed annually)" : "mo"}</span>
              <span className="text-muted-foreground">{seatCount}</span>
            </div>
            <div className="border-t pt-2 flex justify-between text-sm">
              <span className="font-medium">Due today</span>
              <span className="font-semibold text-green-600">${dueToday.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        <div className="p-5 flex flex-col justify-center">
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
    </>
  );
}

export function PaywallDialog({ open, onOpenChange, projectCount }: PaywallDialogProps) {
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [checkout, setCheckout] = useState<CheckoutState | null>(null);
  const { toast } = useToast();

  const handleSelectPlan = async (billing_interval: "monthly" | "annual") => {
    setIsLoading(billing_interval);
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
      console.error("Checkout error:", err);
      toast({ title: "Error", description: err.message || "Failed to start checkout", variant: "destructive" });
    } finally {
      setIsLoading(null);
    }
  };

  const handleClose = (val: boolean) => {
    if (!val) setCheckout(null);
    onOpenChange(val);
  };

  if (checkout) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-4xl p-0 gap-0 overflow-hidden">
          <Elements stripe={stripePromise}>
            <CheckoutCardForm
              billingInterval={checkout.billingInterval}
              seatCount={checkout.seatCount}
              onBack={() => setCheckout(null)}
              onSuccess={() => handleClose(false)}
            />
          </Elements>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-yellow-500" />
            <DialogTitle>Upgrade to BuilderSuite Pro</DialogTitle>
          </div>
           <DialogDescription>
            You've used your {projectCount} free projects. Upgrade to create unlimited projects.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <ul className="space-y-2">
            {features.map((feature) => (
              <li key={feature} className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
          <div className="grid grid-cols-2 gap-3 pt-4">
            <div className="border rounded-lg p-4 text-center space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Monthly</div>
              <div className="text-2xl font-bold">$39</div>
              <div className="text-xs text-muted-foreground">per user / month</div>
              <Button className="w-full" onClick={() => handleSelectPlan("monthly")} disabled={!!isLoading}>
                {isLoading === "monthly" ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                {isLoading === "monthly" ? "Loading..." : "Select"}
              </Button>
            </div>
            <div className="border-2 border-primary rounded-lg p-4 text-center space-y-2 relative">
              <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">Save 15%</div>
              <div className="text-sm font-medium text-muted-foreground">Annual</div>
              <div className="text-2xl font-bold">$33</div>
              <div className="text-xs text-muted-foreground">per user / month</div>
              <Button className="w-full" variant="default" onClick={() => handleSelectPlan("annual")} disabled={!!isLoading}>
                {isLoading === "annual" ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                {isLoading === "annual" ? "Loading..." : "Select"}
              </Button>
            </div>
          </div>
          <p className="text-xs text-center text-muted-foreground pt-2">Cancel anytime from your account settings.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
