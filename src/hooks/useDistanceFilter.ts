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
      // Get Google Maps API key
      const { data: keyData, error: keyError } = await supabase.functions.invoke('get-google-maps-key');
      
      if (keyError || !keyData?.apiKey) {
        throw new Error('Failed to get Google Maps API key');
      }

      // Filter companies that have addresses
      const companiesWithAddresses = companies.filter(
        company => company.companies.address && company.companies.address.trim()
      );

      if (companiesWithAddresses.length === 0) {
        setIsCalculating(false);
        setHasCalculated(true);
        return;
      }

      // Batch companies for API efficiency (max 25 destinations per request)
      const batches = [];
      const batchSize = 25;
      
      for (let i = 0; i < companiesWithAddresses.length; i += batchSize) {
        batches.push(companiesWithAddresses.slice(i, i + batchSize));
      }

      // Process each batch
      for (const batch of batches) {
        const destinations = batch.map(company => company.companies.address).join('|');
        
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/distancematrix/json?` +
          `origins=${encodeURIComponent(projectAddress)}&` +
          `destinations=${encodeURIComponent(destinations)}&` +
          `units=imperial&` +
          `mode=driving&` +
          `key=${keyData.apiKey}`
        );

        if (!response.ok) {
          throw new Error('Distance Matrix API request failed');
        }

        const data = await response.json();
        
        if (data.status !== 'OK') {
          throw new Error(`Distance Matrix API error: ${data.status}`);
        }

        // Process results for this batch
        data.rows[0]?.elements?.forEach((element: any, index: number) => {
          const company = batch[index];
          const companyId = company.id;

          if (element.status === 'OK' && element.distance && element.distance.value) {
            // Convert meters to miles
            const distanceInMiles = element.distance.value * 0.000621371;
            results[companyId] = {
              companyId,
              distance: Math.round(distanceInMiles * 10) / 10 // Round to 1 decimal
            };
          } else {
            results[companyId] = {
              companyId,
              distance: null,
              error: element.status === 'ZERO_RESULTS' ? 'No route found' : 'Unknown error'
            };
          }
        });
      }

      // Handle companies without addresses
      companies.forEach(company => {
        if (!company.companies.address || !company.companies.address.trim()) {
          results[company.id] = {
            companyId: company.id,
            distance: null,
            error: 'No address available'
          };
        }
      });

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
        if (result.distance === null) return true; // Include companies with no distance data
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