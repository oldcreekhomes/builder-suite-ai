import { useSubscription } from "@/hooks/useSubscription";
import { useUserRole } from "@/hooks/useUserRole";
import { useState, useCallback } from "react";
import { Crown, Lock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { loadStripe } from "@stripe/stripe-js";
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from "@stripe/react-stripe-js";

const stripePromise = loadStripe(
  "pk_test_51TL5mD2OJCoyD632I78ZLOABNArQ3j0vjFOIDJxojGuktR4wIGPZeq5HDRlyjtPqNruAa7HDRRQWTmA6N1aKFHck00850Qmh79"
);

interface SubscriptionGateProps {
  children: React.ReactNode;
}

export function SubscriptionGate({ children }: SubscriptionGateProps) {
  const { needsSubscription, projectCount, isLoading } = useSubscription();
  const { isEmployee, isLoading: rolesLoading } = useUserRole();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSelectPlan = async (billing_interval: "monthly" | "annual") => {
    setLoadingPlan(billing_interval);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout-session", {
        body: { billing_interval },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.clientSecret) {
        setClientSecret(data.clientSecret);
      }
    } catch (err: any) {
      console.error("Checkout error:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to start checkout",
        variant: "destructive",
      });
    } finally {
      setLoadingPlan(null);
    }
  };

  if (isLoading || rolesLoading) return <>{children}</>;
  if (isEmployee) return <>{children}</>;

  if (needsSubscription) {
    // Show embedded Stripe checkout inline
    if (clientSecret) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-muted/30 p-6">
          <div className="max-w-3xl w-full">
            <Button
              variant="ghost"
              size="sm"
              className="mb-4"
              onClick={() => setClientSecret(null)}
            >
              ← Back to plans
            </Button>
            <EmbeddedCheckoutProvider stripe={stripePromise} options={{ clientSecret }}>
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          </div>
        </div>
      );
    }

    // Plan selection screen
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-6">
        <div className="max-w-lg w-full text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
            <Lock className="h-8 w-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold">Subscription Required</h1>
          <p className="text-muted-foreground">
            You have {projectCount} projects, which exceeds the free tier limit of 2.
            Please subscribe to continue using BuilderSuite.
          </p>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="border rounded-lg p-5 flex flex-col items-center">
              <div className="text-sm font-medium text-muted-foreground">Monthly</div>
              <div className="text-2xl font-bold mt-2">$39</div>
              <div className="text-xs text-muted-foreground mt-1">per user / month</div>
              <div className="w-full mt-4">
                <Button
                  onClick={() => handleSelectPlan("monthly")}
                  disabled={!!loadingPlan}
                  className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white"
                >
                  {loadingPlan === "monthly" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Crown className="h-4 w-4" />
                  )}
                  {loadingPlan === "monthly" ? "Loading..." : "Subscribe Monthly"}
                </Button>
              </div>
            </div>

            <div className="border-2 border-primary rounded-lg p-5 flex flex-col items-center relative">
              <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                Save 15%
              </div>
              <div className="text-sm font-medium text-muted-foreground">Annual</div>
              <div className="text-2xl font-bold mt-2">$33</div>
              <div className="text-xs text-muted-foreground mt-1">per user / month</div>
              <div className="w-full mt-4">
                <Button
                  onClick={() => handleSelectPlan("annual")}
                  disabled={!!loadingPlan}
                  className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white"
                >
                  {loadingPlan === "annual" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Crown className="h-4 w-4" />
                  )}
                  {loadingPlan === "annual" ? "Loading..." : "Subscribe Annual"}
                </Button>
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            14-day free trial. Cancel anytime. No charge until trial ends.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
