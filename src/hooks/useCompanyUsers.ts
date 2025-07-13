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

      // Get current user's profile from unified users table
      const { data: currentUserProfile } = await supabase
        .from('users')
        .select('role, home_builder_id')
        .eq('id', currentUser.user.id)
        .maybeSingle();

      if (!currentUserProfile) return;

      if (currentUserProfile.role === 'owner') {
        // User is owner - get all employees
        const { data: employees } = await supabase
          .from('users')
          .select('*')
          .eq('home_builder_id', currentUser.user.id)
          .eq('role', 'employee')
          .eq('confirmed', true);
        
        allUsers = employees?.map(emp => ({
          id: emp.id,
          first_name: emp.first_name,
          last_name: emp.last_name,
          role: emp.role,
          avatar_url: emp.avatar_url,
          email: emp.email
        })) || [];
      } else if (currentUserProfile.role === 'employee' && currentUserProfile.home_builder_id) {
        // User is employee - get owner and other employees
        // Get owner
        const { data: owner } = await supabase
          .from('users')
          .select('*')
          .eq('id', currentUserProfile.home_builder_id)
          .eq('role', 'owner')
          .maybeSingle();

        // Get other employees
        const { data: employees } = await supabase
          .from('users')
          .select('*')
          .eq('home_builder_id', currentUserProfile.home_builder_id)
          .eq('role', 'employee')
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