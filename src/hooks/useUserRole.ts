import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export const useUserRole = () => {
  const { user } = useAuth();

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ['user-roles', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching user roles:', error);
        return [];
      }
      
      return data?.map(r => r.role) || [];
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
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
