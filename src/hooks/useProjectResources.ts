import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ProjectResource {
  resourceId: string;
  resourceName: string;
  resourceGroup: 'Internal' | 'External';
  email?: string;
  phone?: string;
  type: 'user' | 'representative';
}

export interface Representative {
  id: string;
  name: string;
  email: string;
  phone?: string;
  receiveScheduleNotifications: boolean;
}

export interface CompanyWithRepresentatives {
  companyId: string;
  companyName: string;
  representatives: Representative[];
}

export const useProjectResources = () => {
  const [resources, setResources] = useState<ProjectResource[]>([]);
  const [companies, setCompanies] = useState<CompanyWithRepresentatives[]>([]);
  const [internalUsers, setInternalUsers] = useState<ProjectResource[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchResources = async () => {
    try {
      setIsLoading(true);
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) return;

      let allResources: ProjectResource[] = [];
      let allCompanies: CompanyWithRepresentatives[] = [];
      let allInternalUsers: ProjectResource[] = [];

      // Get current user's profile to determine company
      const { data: currentUserProfile } = await supabase
        .from('users')
        .select('*')
        .eq('id', currentUser.user.id)
        .maybeSingle();

      if (!currentUserProfile) return;

      // Get company name for filtering
      let companyName = '';
      if (currentUserProfile.role === 'owner') {
        companyName = currentUserProfile.company_name;
      } else if (currentUserProfile.home_builder_id) {
        // Get owner's company name
        const { data: owner } = await supabase
          .from('users')
          .select('company_name')
          .eq('id', currentUserProfile.home_builder_id)
          .eq('role', 'owner')
          .maybeSingle();
        
        companyName = owner?.company_name || '';
      }

      if (!companyName) return;

      // Fetch all users from the same company
      const { data: companyUsers } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, phone_number, role')
        .eq('company_name', companyName)
        .eq('confirmed', true);

      // Add users as internal resources
      if (companyUsers) {
        const userResources = companyUsers.map(user => ({
          resourceId: user.id,
          resourceName: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email,
          resourceGroup: 'Internal' as const,
          email: user.email,
          phone: user.phone_number,
          type: 'user' as const
        }));
        allResources.push(...userResources);
        allInternalUsers = userResources;
      }

      // Determine the home builder owner ID
      let homeBuilderOwnerId: string;
      if (currentUserProfile.role === 'owner') {
        homeBuilderOwnerId = currentUserProfile.id;
      } else if (currentUserProfile.home_builder_id) {
        homeBuilderOwnerId = currentUserProfile.home_builder_id;
      } else {
        setResources(allResources);
        setInternalUsers(allInternalUsers);
        return;
      }

      // Fetch all companies owned by the home builder with their representatives
      const { data: ownedCompanies } = await supabase
        .from('companies')
        .select('id, company_name')
        .eq('home_builder_id', homeBuilderOwnerId)
        .order('company_name');

      if (ownedCompanies && ownedCompanies.length > 0) {
        // Fetch all representatives from all owned companies
        const companyIds = ownedCompanies.map(c => c.id);
        const { data: representatives } = await supabase
          .from('company_representatives')
          .select('id, first_name, last_name, email, phone_number, company_id, receive_schedule_notifications')
          .in('company_id', companyIds);

        // Group representatives by company
        for (const company of ownedCompanies) {
          const companyReps = (representatives || [])
            .filter(rep => rep.company_id === company.id)
            .map(rep => ({
              id: rep.id,
              name: `${rep.first_name} ${rep.last_name || ''}`.trim(),
              email: rep.email,
              phone: rep.phone_number || undefined,
              receiveScheduleNotifications: rep.receive_schedule_notifications || false
            }));

          allCompanies.push({
            companyId: company.id,
            companyName: company.company_name,
            representatives: companyReps
          });

          // Also add to flat resources list for backward compatibility
          companyReps.forEach(rep => {
            allResources.push({
              resourceId: rep.id,
              resourceName: rep.name,
              resourceGroup: 'External',
              email: rep.email,
              phone: rep.phone,
              type: 'representative'
            });
          });
        }
      }

      setResources(allResources);
      setCompanies(allCompanies);
      setInternalUsers(allInternalUsers);
    } catch (error) {
      console.error('Error fetching project resources:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
  }, []);

  return {
    resources,
    companies,
    internalUsers,
    isLoading,
    refetchResources: fetchResources
  };
};
