
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export const useUserProfile = () => {
  const { user } = useAuth();

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      console.log("Fetching profile for user:", user.id);
      
      // First try home_builders table
      let { data, error } = await supabase
        .from('home_builders')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching from home_builders:', error);
      }

      // If not found in home_builders, try employees table
      if (!data) {
        const result = await supabase
          .from('employees')
          .select('*, user_type:role, company_name:home_builder_id')
          .eq('id', user.id)
          .maybeSingle();
        
        if (result.error) {
          console.error('Error fetching from employees:', result.error);
          throw result.error;
        }
        
        if (result.data) {
          // Transform employee data to match home_builder structure
          data = {
            ...result.data,
            user_type: 'employee' as const,
            company_name: null // We'll get this from the home_builder later if needed
          };
        }
      }

      console.log("Profile data:", data);
      return data;
    },
    enabled: !!user?.id,
  });

  return { profile, isLoading, error };
};
