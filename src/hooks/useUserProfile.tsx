
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
      // All users are now in the users table
      let { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching from users:', error);
      }

      if (data) {
        console.log("Found user profile:", data);
      } else {
        console.log("User profile not found for:", user.id);
      }

      console.log("Profile data:", data);
      return data;
    },
    enabled: !!user?.id,
  });

  return { profile, isLoading, error };
};
