import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Company {
  id: string;
  company_name: string;
  company_type: string;
  address?: string;
}

interface BiddingCompany {
  id: string;
  company_id: string;
  bid_status: 'will_bid' | 'will_not_bid' | null;
  price: number | null;
  proposals: string[] | null;
  companies: Company;
}

interface DistanceResult {
  companyId: string;
  distance: number | null; // in miles
  error?: string;
}

interface UseDistanceFilterOptions {
  enabled: boolean;
  radiusMiles: number;
  projectAddress: string;
  companies: BiddingCompany[];
}

export function useDistanceFilter({
  enabled,
  radiusMiles,
  projectAddress,
  companies = []
}: UseDistanceFilterOptions) {
  const [distances, setDistances] = useState<Record<string, DistanceResult>>({});
  const [isCalculating, setIsCalculating] = useState(false);
  const [hasCalculated, setHasCalculated] = useState(false);

  // Calculate distances when filter is enabled
  useEffect(() => {
    if (!enabled || !projectAddress.trim() || companies.length === 0) {
      setDistances({});
      setHasCalculated(false);
      return;
    }

    calculateDistances();
  }, [enabled, projectAddress, companies]);

  const calculateDistances = async () => {
    if (isCalculating || hasCalculated) return;
    
    setIsCalculating(true);
    const results: Record<string, DistanceResult> = {};

    try {
      // Prepare company data for the edge function
      const companyData = companies.map(company => ({
        id: company.id,
        address: company.companies.address || ''
      }));

      // Call the edge function to calculate distances
      const { data, error } = await supabase.functions.invoke('calculate-distances', {
        body: {
          projectAddress,
          companies: companyData
        }
      });

      if (error) {
        throw new Error(`Edge function error: ${error.message}`);
      }

      if (data?.results) {
        Object.assign(results, data.results);
      } else {
        throw new Error('Invalid response from distance calculation service');
      }

    } catch (error) {
      console.error('Error calculating distances:', error);
      // Set error state for all companies
      companies.forEach(company => {
        results[company.id] = {
          companyId: company.id,
          distance: null,
          error: 'Distance calculation failed'
        };
      });
    }

    setDistances(results);
    setIsCalculating(false);
    setHasCalculated(true);
  };

  // Filter companies based on distance
  const filteredCompanies = enabled 
    ? companies.filter(company => {
        const result = distances[company.id];
        if (!result) return true; // Include while calculating
        if (result.distance === null) return false; // EXCLUDE companies with no distance data
        return result.distance <= radiusMiles;
      })
    : companies;

  const getDistanceForCompany = (companyId: string): DistanceResult | null => {
    return distances[companyId] || null;
  };

  const companiesInRange = Object.values(distances).filter(
    result => result.distance !== null && result.distance <= radiusMiles
  ).length;

  const companiesWithAddresses = companies.filter(
    company => company.companies.address && company.companies.address.trim()
  ).length;

  return {
    filteredCompanies,
    isCalculating,
    hasCalculated,
    getDistanceForCompany,
    distances,
    stats: {
      total: companies.length,
      withAddresses: companiesWithAddresses,
      inRange: companiesInRange,
      filtered: filteredCompanies.length
    }
  };
}