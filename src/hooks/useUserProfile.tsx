
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
      
      // First check if user is a home builder in users table
      let { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching from users:', error);
      }

      if (data) {
        console.log("Found home builder profile:", data);
        return data;
      }

      // If not found in users table, check employees table
      console.log("Not found in users table, checking employees table...");
      const { data: employeeData, error: employeeError } = await supabase
        .from('employees')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (employeeError) {
        console.error('Error fetching from employees:', employeeError);
      }

      if (employeeData) {
        console.log("Found employee profile:", employeeData);
        return employeeData;
      }

      console.log("User profile not found in either table for:", user.id);
      return null;
    },
    enabled: !!user?.id,
  });

  return { profile, isLoading, error };
};
