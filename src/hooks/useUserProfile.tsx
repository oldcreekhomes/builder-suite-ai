
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
        console.log("Checking employees table for user:", user.id);
        
        // First check if we can see ANY employees (debugging)
        const allEmployeesResult = await supabase
          .from('employees')
          .select('id, email, confirmed')
          .limit(5);
        console.log("Can see any employees?", allEmployeesResult);
        
        const result = await supabase
          .from('employees')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();
        
        console.log("Employee query result:", result);
        
        if (result.error) {
          console.error('Error fetching from employees:', result.error);
        }
        
        if (result.data) {
          console.log("Found employee data:", result.data);
          // Transform employee data to match home_builder structure
          data = {
            ...result.data,
            user_type: 'employee' as const,
            company_name: null // We'll get this from the home_builder later if needed
          };
        } else {
          console.log("No employee data found for user:", user.id);
        }
      }

      console.log("Profile data:", data);
      return data;
    },
    enabled: !!user?.id,
  });

  return { profile, isLoading, error };
};
