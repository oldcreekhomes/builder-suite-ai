import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type SubscriptionTier = 'free' | 'pro' | 'enterprise';

export interface MarketplaceSubscription {
  id: string;
  owner_id: string;
  tier: SubscriptionTier;
  max_radius_miles: number;
  status: 'active' | 'cancelled' | 'expired';
  stripe_subscription_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
}

export const TIER_LIMITS: Record<SubscriptionTier, { radius: number; price: number; label: string }> = {
  free: { radius: 30, price: 0, label: 'Free' },
  pro: { radius: 100, price: 29, label: 'Pro' },
  enterprise: { radius: Infinity, price: 99, label: 'Enterprise' },
};

export function useMarketplaceSubscription() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: subscription, isLoading, error } = useQuery({
    queryKey: ['marketplace-subscription', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // Get owner_id (for employees, get their home builder's subscription)
      const { data: userInfo } = await supabase.rpc('get_current_user_home_builder_info');
      const ownerId = userInfo?.[0]?.is_employee ? userInfo[0].home_builder_id : user.id;

      const { data, error } = await supabase
        .from('marketplace_subscriptions')
        .select('*')
        .eq('owner_id', ownerId)
        .maybeSingle();

      if (error) throw error;

      // If no subscription exists, return default free tier
      if (!data) {
        return {
          id: '',
          owner_id: ownerId,
          tier: 'free' as SubscriptionTier,
          max_radius_miles: 30,
          status: 'active' as const,
          stripe_subscription_id: null,
          current_period_start: null,
          current_period_end: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      }

      return data as MarketplaceSubscription;
    },
    enabled: !!user?.id,
  });

  const tier = subscription?.tier || 'free';
  const maxRadius = TIER_LIMITS[tier].radius;
  const isActive = subscription?.status === 'active';

  return {
    subscription,
    tier,
    maxRadius,
    isActive,
    isLoading,
    error,
    tierLimits: TIER_LIMITS,
  };
}
