import { useState } from "react";
import { useSubscription } from "@/hooks/useSubscription";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PaywallDialog } from "@/components/PaywallDialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ManageSubscriptionDialog } from "@/components/settings/ManageSubscriptionDialog";
import { Crown, Users, FolderOpen, Calendar, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";

export function SubscriptionTab() {
  const {
    subscription,
    status,
    isOnFreeTier,
    isTrialing,
    isActive,
    isPastDue,
    isCanceled,
    trialEndsAt,
    trialDaysRemaining,
    projectCount,
    ownerId,
  } = useSubscription();
  const { isOwner } = useUserRole();
  const { toast } = useToast();
  const [showPaywall, setShowPaywall] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  // Get seat count
  const { data: seatCount = 1 } = useQuery({
    queryKey: ["seat-count", ownerId],
    queryFn: async () => {
      if (!ownerId) return 1;
      const { count } = await supabase
        .from("users")
        .select("id", { count: "exact", head: true })
        .eq("home_builder_id", ownerId)
        .eq("confirmed", true);
      return 1 + (count || 0); // owner + employees
    },
    enabled: !!ownerId,
  });

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err: any) {
      console.error("Portal error:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to open billing portal",
        variant: "destructive",
      });
    } finally {
      setPortalLoading(false);
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
          <CardDescription>
            Subscription management is only available to the account owner.
          </CardDescription>
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

      {/* Plan Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Current Plan</CardTitle>
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
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
            {(isTrialing || isActive) && subscription?.current_period_end && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium">
                    {format(new Date(subscription.current_period_end), "MMM d, yyyy")}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {isTrialing ? "Trial ends" : "Next billing"}
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Billing</CardTitle>
          <CardDescription>
            {isOnFreeTier
              ? "Upgrade to Pro to unlock unlimited projects and all features."
              : "Manage your payment method, change plans, or cancel."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isOnFreeTier ? (
            <Button onClick={() => setShowPaywall(true)} className="gap-2">
              <Crown className="h-4 w-4" />
              Upgrade to Pro
            </Button>
          ) : (
            <Button onClick={handleManageSubscription} disabled={portalLoading} variant="outline" className="gap-2">
              {portalLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
              Manage Subscription
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Pricing Reference */}
      {isOnFreeTier && (
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
      )}

      <PaywallDialog open={showPaywall} onOpenChange={setShowPaywall} projectCount={projectCount} />
    </div>
  );
}
