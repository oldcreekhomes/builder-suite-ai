import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SERVICE_AREA_OPTIONS } from "@/lib/serviceArea";

export interface MarketplaceSubscription {
  id: string;
  owner_id: string;
  allowed_service_areas: string[];
  status: 'active' | 'cancelled' | 'expired';
  stripe_subscription_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
}

export function useMarketplaceSubscription() {
  const { user } = useAuth();

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

      // If no subscription exists, return default (1 free service area)
      if (!data) {
        return {
          id: '',
          owner_id: ownerId,
          allowed_service_areas: [SERVICE_AREA_OPTIONS[0]], // Default: "Washington, DC"
          status: 'active' as const,
          stripe_subscription_id: null,
          current_period_start: null,
          current_period_end: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      }

      return {
        ...data,
        allowed_service_areas: (data as any).allowed_service_areas || [SERVICE_AREA_OPTIONS[0]],
      } as MarketplaceSubscription;
    },
    enabled: !!user?.id,
  });

  const allowedAreas = subscription?.allowed_service_areas || [SERVICE_AREA_OPTIONS[0]];
  const isActive = subscription?.status === 'active';

  return {
    subscription,
    allowedAreas,
    isActive,
    isLoading,
    error,
  };
}
