import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Company {
  id: string;
  company_name: string;
  company_type: string;
  address?: string;
}

/**
 * Hook to search companies from the database.
 * Uses React Query for automatic refetching when data changes.
 * @param companyTypes - Optional array of company types to filter by (e.g., ['Subcontractor', 'Vendor']).
 *                       If not provided, all companies are returned.
 */
export function useCompanySearch(companyTypes?: string[]) {
  // Create a stable query key based on company types
  const queryKey = companyTypes 
    ? ['companies', ...companyTypes.sort()]
    : ['companies'];

  const { data: companies = [], isLoading: loading } = useQuery({
    queryKey,
    queryFn: async () => {
      let query = supabase
        .from('companies')
        .select('id, company_name, company_type, address')
        .order('company_name');

      // Filter by company types if provided
      if (companyTypes && companyTypes.length > 0) {
        query = query.in('company_type', companyTypes);
        console.log('useCompanySearch: Filtering by company types:', companyTypes);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      console.log(`useCompanySearch: Fetched ${data?.length || 0} companies`, {
        typesFilter: companyTypes || 'all',
      });
      
      return (data || []) as Company[];
    },
  });

  const searchCompanies = (query: string) => {
    if (!query.trim()) return companies;
    
    const lowercaseQuery = query.toLowerCase();
    return companies.filter(company => 
      company.company_name.toLowerCase().includes(lowercaseQuery) ||
      (company.company_type && company.company_type.toLowerCase().includes(lowercaseQuery))
    );
  };

  return { companies, searchCompanies, loading };
}
