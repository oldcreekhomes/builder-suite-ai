import { useSubscription } from "@/hooks/useSubscription";
import { AlertTriangle, Clock, CreditCard } from "lucide-react";
import { useState } from "react";
import { PaywallDialog } from "./PaywallDialog";

export function SubscriptionBanner() {
  const { isTrialing, isPastDue, trialDaysRemaining, projectCount, needsSubscription } = useSubscription();
  const [showPaywall, setShowPaywall] = useState(false);

  if (isPastDue) {
    return (
      <>
        <div className="bg-destructive/10 border-b border-destructive/20 px-4 py-2 flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-4 w-4" />
            <span className="font-medium">Payment failed — please update your billing info to avoid service interruption.</span>
          </div>
          <button
            onClick={() => setShowPaywall(true)}
            className="text-destructive font-medium underline hover:no-underline"
          >
            Update billing
          </button>
        </div>
        <PaywallDialog open={showPaywall} onOpenChange={setShowPaywall} projectCount={projectCount} />
      </>
    );
  }

  if (isTrialing && trialDaysRemaining !== null && trialDaysRemaining <= 7) {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-700/30 px-4 py-2 flex items-center gap-2 text-sm text-yellow-800 dark:text-yellow-200">
        <Clock className="h-4 w-4" />
        <span>
          {trialDaysRemaining === 0
            ? "Your trial ends today!"
            : `${trialDaysRemaining} day${trialDaysRemaining !== 1 ? "s" : ""} left in your trial.`}
        </span>
      </div>
    );
  }

  if (needsSubscription) {
    return (
      <>
        <div className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-700/30 px-4 py-2 flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
            <CreditCard className="h-4 w-4" />
            <span>You've used your 2 free projects. Upgrade to create more.</span>
          </div>
          <button
            onClick={() => setShowPaywall(true)}
            className="text-blue-700 dark:text-blue-300 font-medium underline hover:no-underline"
          >
            Upgrade now
          </button>
        </div>
        <PaywallDialog open={showPaywall} onOpenChange={setShowPaywall} projectCount={projectCount} />
      </>
    );
  }

  return null;
}
