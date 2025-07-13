
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
      
      // Fetch user from the unified users table
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user profile:', error);
        return null;
      }

      if (data) {
        console.log("Found user profile:", data);
        return data;
      }

      console.log("User profile not found for:", user.id);
      return null;
    },
    enabled: !!user?.id,
  });

  return { profile, isLoading, error };
};
