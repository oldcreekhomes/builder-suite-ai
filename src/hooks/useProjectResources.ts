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
      } else if (currentUserProfile.role === 'employee' && currentUserProfile.home_builder_id) {
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

      // Try to find company representatives
      // First, try to find the company in the companies table by matching company_name
      let companyReps: any[] = [];
      
      const { data: company } = await supabase
        .from('companies')
        .select('id')
        .eq('company_name', companyName)
        .maybeSingle();

      if (company) {
        console.log('Found company in companies table:', company.id);
        // Fetch company representatives
        const { data: representatives } = await supabase
          .from('company_representatives')
          .select('id, first_name, last_name, email, phone_number')
          .eq('company_id', company.id);

        if (representatives) {
          companyReps = representatives;
        }
      } else {
        // If company not found in companies table, try to fetch all representatives
        // and filter by any companies that might match
        console.log('Company not found in companies table, fetching all representatives');
        const { data: allCompanies } = await supabase
          .from('companies')
          .select('id, company_name');
        
        if (allCompanies) {
          // Find companies with similar names (case insensitive)
          const matchingCompany = allCompanies.find(c => 
            c.company_name.toLowerCase() === companyName.toLowerCase()
          );
          
          if (matchingCompany) {
            const { data: representatives } = await supabase
              .from('company_representatives')
              .select('id, first_name, last_name, email, phone_number')
              .eq('company_id', matchingCompany.id);

            if (representatives) {
              companyReps = representatives;
            }
          }
        }
      }

      // Add representatives as external resources
      if (companyReps.length > 0) {
        console.log('Found representatives:', companyReps);
        const repResources = companyReps.map(rep => ({
          resourceId: rep.id,
          resourceName: `${rep.first_name} ${rep.last_name}`.trim(),
          resourceGroup: 'External' as const,
          email: rep.email,
          phone: rep.phone_number,
          type: 'representative' as const
        }));
        allResources.push(...repResources);
      } else {
        console.log('No representatives found for company:', companyName);
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