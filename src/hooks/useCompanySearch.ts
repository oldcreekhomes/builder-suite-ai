import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Company {
  id: string;
  company_name: string;
  company_type?: string;
  address?: string;
}

export function useCompanySearch() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const { data, error } = await supabase
          .from('companies')
          .select('id, company_name, company_type, address')
          .order('company_name');

        if (error) throw error;
        setCompanies(data || []);
      } catch (error) {
        console.error('Error fetching companies:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCompanies();
  }, []);

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