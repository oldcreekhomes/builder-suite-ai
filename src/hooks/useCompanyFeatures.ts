import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface CompanyFeatures {
  apartments: boolean;
  estimating: boolean;
  marketplace: boolean;
  templates: boolean;
}

const DEFAULT_FEATURES: CompanyFeatures = {
  apartments: false,
  estimating: false,
  marketplace: false,
  templates: false,
};

/**
 * Returns the set of feature flags enabled for the current user's company.
 * Backed by the `get_my_company_features()` RPC, which reads
 * `public.company_feature_access` (set by the Platform Admin app).
 *
 * Default-OFF semantics: features are disabled unless an explicit
 * `enabled = true` row exists for the company.
 */
export const useCompanyFeatures = () => {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["company-features", user?.id],
    queryFn: async (): Promise<CompanyFeatures> => {
      const { data, error } = await supabase.rpc("get_my_company_features");
      if (error) {
        console.error("Error fetching company features:", error);
        return DEFAULT_FEATURES;
      }
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) return DEFAULT_FEATURES;
      return {
        apartments: row.apartments ?? false,
        estimating: row.estimating ?? false,
        marketplace: row.marketplace ?? false,
        templates: row.templates ?? false,
      };
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  return {
    features: data ?? DEFAULT_FEATURES,
    isLoading,
  };
};
