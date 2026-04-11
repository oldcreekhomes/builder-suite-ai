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
import { Check, Crown } from "lucide-react";

interface PaywallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectCount: number;
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

export function PaywallDialog({ open, onOpenChange, projectCount }: PaywallDialogProps) {
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const { toast } = useToast();

  const handleCheckout = async (billing_interval: "monthly" | "annual") => {
    setIsLoading(billing_interval);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout-session", {
        body: { billing_interval },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err: any) {
      console.error("Checkout error:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to start checkout",
        variant: "destructive",
      });
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-yellow-500" />
            <DialogTitle>Upgrade to BuilderSuite Pro</DialogTitle>
          </div>
          <DialogDescription>
            You've used your {projectCount} free projects. Upgrade to create unlimited projects with a 14-day free trial.
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
              <Button
                className="w-full"
                onClick={() => handleCheckout("monthly")}
                disabled={!!isLoading}
              >
                {isLoading === "monthly" ? "Loading..." : "Start Free Trial"}
              </Button>
            </div>

            <div className="border-2 border-primary rounded-lg p-4 text-center space-y-2 relative">
              <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                Save 15%
              </div>
              <div className="text-sm font-medium text-muted-foreground">Annual</div>
              <div className="text-2xl font-bold">$33</div>
              <div className="text-xs text-muted-foreground">per user / month</div>
              <Button
                className="w-full"
                variant="default"
                onClick={() => handleCheckout("annual")}
                disabled={!!isLoading}
              >
                {isLoading === "annual" ? "Loading..." : "Start Free Trial"}
              </Button>
            </div>
          </div>

          <p className="text-xs text-center text-muted-foreground pt-2">
            14-day free trial. Cancel anytime. No charge until trial ends.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
