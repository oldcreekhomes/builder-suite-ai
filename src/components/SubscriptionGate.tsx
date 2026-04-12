import { useSubscription } from "@/hooks/useSubscription";
import { useUserRole } from "@/hooks/useUserRole";
import { useLocation } from "react-router-dom";
import { PaywallDialog } from "./PaywallDialog";
import { useState } from "react";
import { Crown, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SubscriptionGateProps {
  children: React.ReactNode;
}

export function SubscriptionGate({ children }: SubscriptionGateProps) {
  const { needsSubscription, projectCount, isLoading } = useSubscription();
  const { isEmployee, isLoading: rolesLoading } = useUserRole();
  const [showPaywall, setShowPaywall] = useState(false);

  // Don't gate while loading
  if (isLoading || rolesLoading) return <>{children}</>;

  // Employees are exempt — their owner is responsible
  if (isEmployee) return <>{children}</>;

  // If subscription is needed, show full-screen paywall — NO exceptions
  if (needsSubscription) {
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
          <Button onClick={() => setShowPaywall(true)} size="lg" className="gap-2 bg-green-600 hover:bg-green-700 text-white">
            <Crown className="h-4 w-4" />
            Subscribe Now
          </Button>
        </div>
        <PaywallDialog open={showPaywall} onOpenChange={setShowPaywall} projectCount={projectCount} />
      </div>
    );
  }

  return <>{children}</>;
}
