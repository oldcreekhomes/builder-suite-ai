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

export const useProjectResources = () => {
  const [resources, setResources] = useState<ProjectResource[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchResources = async () => {
    try {
      setIsLoading(true);
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) return;

      let allResources: ProjectResource[] = [];

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

      console.log('Fetching resources for company:', companyName);

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
      }

      // Determine the home builder owner ID
      let homeBuilderOwnerId: string;
      if (currentUserProfile.role === 'owner') {
        homeBuilderOwnerId = currentUserProfile.id;
      } else if (currentUserProfile.home_builder_id) {
        homeBuilderOwnerId = currentUserProfile.home_builder_id;
      } else {
        console.log('Unable to determine home builder owner ID');
        setResources(allResources);
        return;
      }

      console.log('Fetching representatives for home builder owner:', homeBuilderOwnerId);

      // Fetch all companies owned by the home builder
      const { data: ownedCompanies } = await supabase
        .from('companies')
        .select('id')
        .eq('home_builder_id', homeBuilderOwnerId);

      if (ownedCompanies && ownedCompanies.length > 0) {
        console.log('Found owned companies:', ownedCompanies);
        
        // Fetch all representatives from all owned companies
        const companyIds = ownedCompanies.map(c => c.id);
        const { data: representatives } = await supabase
          .from('company_representatives')
          .select('id, first_name, last_name, email, phone_number')
          .in('company_id', companyIds);

        if (representatives && representatives.length > 0) {
          console.log('Found representatives:', representatives);
          const repResources = representatives.map(rep => ({
            resourceId: rep.id,
            resourceName: `${rep.first_name} ${rep.last_name}`.trim(),
            resourceGroup: 'External' as const,
            email: rep.email,
            phone: rep.phone_number,
            type: 'representative' as const
          }));
          allResources.push(...repResources);
        }
      } else {
        console.log('No owned companies found for home builder owner:', homeBuilderOwnerId);
      }

      console.log('Fetched resources:', allResources);
      setResources(allResources);
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
    isLoading,
    refetchResources: fetchResources
  };
};