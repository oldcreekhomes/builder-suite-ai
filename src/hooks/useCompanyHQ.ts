import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface CompanyHQ {
  hq_address: string | null;
  hq_city: string | null;
  hq_state: string | null;
  hq_zip: string | null;
  hq_lat: number | null;
  hq_lng: number | null;
}

export interface UpdateHQData {
  hq_address: string;
  hq_city: string;
  hq_state: string;
  hq_zip: string;
  hq_lat: number;
  hq_lng: number;
}

export function useCompanyHQ() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: hqData, isLoading, error } = useQuery({
    queryKey: ['company-hq', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // Get owner_id (for employees, get their home builder's HQ)
      const { data: userInfo } = await supabase.rpc('get_current_user_home_builder_info');
      const ownerId = userInfo?.[0]?.is_employee ? userInfo[0].home_builder_id : user.id;

      const { data, error } = await supabase
        .from('users')
        .select('hq_address, hq_city, hq_state, hq_zip, hq_lat, hq_lng')
        .eq('id', ownerId)
        .single();

      if (error) throw error;
      return data as CompanyHQ;
    },
    enabled: !!user?.id,
  });

  const updateHQMutation = useMutation({
    mutationFn: async (data: UpdateHQData) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Get owner_id (for employees, get their home builder's id)
      const { data: userInfo } = await supabase.rpc('get_current_user_home_builder_info');
      const ownerId = userInfo?.[0]?.is_employee ? userInfo[0].home_builder_id : user.id;

      const { error } = await supabase
        .from('users')
        .update({
          hq_address: data.hq_address,
          hq_city: data.hq_city,
          hq_state: data.hq_state,
          hq_zip: data.hq_zip,
          hq_lat: data.hq_lat,
          hq_lng: data.hq_lng,
        })
        .eq('id', ownerId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-hq'] });
      toast.success('Company headquarters updated');
    },
    onError: (error) => {
      console.error('Error updating HQ:', error);
      toast.error('Failed to update headquarters');
    },
  });

  const hasHQSet = !!(hqData?.hq_lat && hqData?.hq_lng);

  return {
    hqData,
    isLoading,
    error,
    hasHQSet,
    updateHQ: updateHQMutation.mutate,
    isUpdating: updateHQMutation.isPending,
  };
}
