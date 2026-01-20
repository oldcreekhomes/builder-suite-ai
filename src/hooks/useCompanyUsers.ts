import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface User {
  id: string;
  first_name: string;
  last_name: string;
  role?: string;
  avatar_url?: string;
  email: string;
  phone_number?: string;
  company_name?: string;
  confirmed?: boolean;
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
        .select('*')
        .eq('id', currentUser.user.id)
        .maybeSingle();

      console.log('Current user profile:', currentUserProfile);

      if (!currentUserProfile) return;

      if (currentUserProfile.role === 'owner') {
        // User is owner - get all employees in the company AND include self
        const { data: employees } = await supabase
          .from('users')
          .select('*')
          .eq('home_builder_id', currentUser.user.id)
          .eq('confirmed', true);
        
        // Include the owner (current user) and all employees
        allUsers = [
          {
            id: currentUser.user.id,
            first_name: currentUserProfile.first_name || 'Owner',
            last_name: currentUserProfile.last_name || '',
            role: 'owner',
            avatar_url: currentUserProfile.avatar_url,
            email: currentUser.user.email || '',
            phone_number: currentUserProfile.phone_number
          },
          ...(employees?.map(emp => ({
            id: emp.id,
            first_name: emp.first_name,
            last_name: emp.last_name,
            role: emp.role,
            avatar_url: emp.avatar_url,
            email: emp.email,
            phone_number: emp.phone_number
          })) || [])
        ];
      } else if (currentUserProfile.home_builder_id) {
        // User is internal (any role with home_builder_id) - get owner and other internal users
        console.log('Internal user flow - home_builder_id:', currentUserProfile.home_builder_id);
        
        // Get owner
        const { data: owner, error: ownerError } = await supabase
          .from('users')
          .select('*')
          .eq('id', currentUserProfile.home_builder_id)
          .eq('role', 'owner')
          .maybeSingle();

        console.log('Owner query result:', { owner, ownerError });

        // Get ALL internal users (including current user) regardless of role
        const { data: employees, error: employeesError } = await supabase
          .from('users')
          .select('*')
          .eq('home_builder_id', currentUserProfile.home_builder_id)
          .eq('confirmed', true);

        console.log('Employees query result:', { employees, employeesError });

        allUsers = [
          ...(owner ? [{
            id: owner.id,
            first_name: owner.first_name || 'Owner',
            last_name: owner.last_name || '',
            role: 'owner',
            avatar_url: owner.avatar_url,
            email: owner.email,
            phone_number: owner.phone_number
          }] : []),
          ...(employees?.map(emp => ({
            id: emp.id,
            first_name: emp.first_name,
            last_name: emp.last_name,
            role: emp.role,
            avatar_url: emp.avatar_url,
            email: emp.email,
            phone_number: emp.phone_number
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