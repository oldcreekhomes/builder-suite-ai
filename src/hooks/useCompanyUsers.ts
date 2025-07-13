import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface User {
  id: string;
  first_name: string;
  last_name: string;
  role?: string;
  avatar_url?: string;
  email: string;
}

export const useCompanyUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  // Get current user
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        await fetchUsers();
      }
    };
    getCurrentUser();
  }, []);

  // Fetch all users in the company
  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) return;

      let allUsers: User[] = [];

      // Check if current user is an owner
      const { data: ownerProfile } = await supabase
        .from('owners')
        .select('*')
        .eq('id', currentUser.user.id)
        .maybeSingle();

      if (ownerProfile) {
        // User is owner - get all employees
        const { data: employees } = await supabase
          .from('employees')
          .select('*')
          .eq('home_builder_id', currentUser.user.id)
          .eq('confirmed', true);
        
        allUsers = employees?.map(emp => ({
          id: emp.id,
          first_name: emp.first_name,
          last_name: emp.last_name,
          role: emp.role,
          avatar_url: emp.avatar_url,
          email: emp.email
        })) || [];
      } else {
        // User is employee - get owner and other employees
        const { data: employee } = await supabase
          .from('employees')
          .select('home_builder_id')
          .eq('id', currentUser.user.id)
          .single();

        if (employee?.home_builder_id) {
          // Get owner
          const { data: owner } = await supabase
            .from('owners')
            .select('*')
            .eq('id', employee.home_builder_id)
            .single();

          // Get other employees
          const { data: employees } = await supabase
            .from('employees')
            .select('*')
            .eq('home_builder_id', employee.home_builder_id)
            .eq('confirmed', true)
            .neq('id', currentUser.user.id);

          allUsers = [
            ...(owner ? [{
              id: owner.id,
              first_name: owner.first_name || 'Owner',
              last_name: owner.last_name || '',
              role: 'owner',
              avatar_url: owner.avatar_url,
              email: owner.email
            }] : []),
            ...(employees?.map(emp => ({
              id: emp.id,
              first_name: emp.first_name,
              last_name: emp.last_name,
              role: emp.role,
              avatar_url: emp.avatar_url,
              email: emp.email
            })) || [])
          ];
        }
      }

      setUsers(allUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    users,
    currentUserId,
    isLoading,
    refetchUsers: fetchUsers
  };
};