import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";

interface SubscriptionData {
  id: string;
  owner_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  status: string;
  billing_interval: string | null;
  user_count: number;
  trial_ends_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
}

export function useSubscription() {
  const { user } = useAuth();
  const { profile } = useUserProfile();

  const ownerId = profile?.home_builder_id || user?.id;

  const { data: subscription, isLoading } = useQuery({
    queryKey: ["subscription", ownerId],
    queryFn: async () => {
      if (!ownerId) return null;
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("owner_id", ownerId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching subscription:", error);
        return null;
      }
      return data as SubscriptionData | null;
    },
    enabled: !!ownerId,
    staleTime: 30_000,
  });

  // Count projects for the owner
  const { data: projectCount = 0 } = useQuery({
    queryKey: ["project-count", ownerId],
    queryFn: async () => {
      if (!ownerId) return 0;
      const { count, error } = await supabase
        .from("projects")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", ownerId);

      if (error) {
        console.error("Error counting projects:", error);
        return 0;
      }
      return count || 0;
    },
    enabled: !!ownerId,
    staleTime: 30_000,
  });

  const status = subscription?.status || "free";
  const isOnFreeTier = !subscription || status === "free";
  const isTrialing = status === "trialing";
  const isActive = status === "active";
  const isPastDue = status === "past_due";
  const isCanceled = status === "canceled";

  const trialEndsAt = subscription?.trial_ends_at
    ? new Date(subscription.trial_ends_at)
    : null;

  const trialDaysRemaining = trialEndsAt
    ? Math.max(0, Math.ceil((trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  // Can create projects if:
  // - On free tier with < 2 projects
  // - Has active/trialing subscription
  const canCreateProject = isActive || isTrialing || (isOnFreeTier && projectCount < 2);
  const needsSubscription = isOnFreeTier && projectCount >= 2;

  return {
    subscription,
    isLoading,
    status,
    isOnFreeTier,
    isTrialing,
    isActive,
    isPastDue,
    isCanceled,
    trialEndsAt,
    trialDaysRemaining,
    projectCount,
    canCreateProject,
    needsSubscription,
    ownerId,
  };
}
