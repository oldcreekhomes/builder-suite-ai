import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export const useUserRole = () => {
  const { user, isImpersonating } = useAuth();
  
  // Use the user's ID (which could be impersonated user or real user)
  const userId = user?.id;

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ['user-roles', userId, isImpersonating],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching user roles:', error);
        return [];
      }
      
      return data?.map(r => r.role) || [];
    },
    enabled: !!userId,
    staleTime: isImpersonating ? 0 : 5 * 60 * 1000, // Don't cache when impersonating
  });

  return {
    roles,
    isLoading,
    isOwner: roles.includes('owner'),
    isAccountant: roles.includes('accountant'),
    isEmployee: roles.includes('employee'),
    canDeleteBills: roles.includes('owner') || roles.includes('accountant'),
  };
};
