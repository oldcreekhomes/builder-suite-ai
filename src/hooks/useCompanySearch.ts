import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Company {
  id: string;
  company_name: string;
  company_category: string;
  company_type?: string | null;
  address?: string;
}

/**
 * Hook to search companies from the database.
 * @param companyCategories - Optional array of company categories to filter by (e.g., ['Subcontractor', 'Vendor']).
 *                            If not provided, all companies are returned.
 */
export function useCompanySearch(companyCategories?: string[]) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        let query = supabase
          .from('companies')
          .select('id, company_name, company_category, company_type, address')
          .order('company_name');

        // Explicitly filter by company categories if provided
        if (companyCategories && companyCategories.length > 0) {
          query = query.in('company_category', companyCategories);
          console.log('useCompanySearch: Filtering by company categories:', companyCategories);
        }

        const { data, error } = await query;

        if (error) throw error;
        setCompanies(data || []);
        
        console.log(`useCompanySearch: Fetched ${data?.length || 0} companies`, {
          categoriesFilter: companyCategories || 'all',
        });
      } catch (error) {
        console.error('Error fetching companies:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCompanies();
  }, [companyCategories?.join(',')]); // Re-fetch if companyCategories change

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
