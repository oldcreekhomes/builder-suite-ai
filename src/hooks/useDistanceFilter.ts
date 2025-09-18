import { useState, useEffect, useMemo } from 'react';
import { distanceCalculator } from '@/utils/distanceCalculation';

interface Company {
  id: string;
  company_name: string;
  address: string;
  [key: string]: any;
}

interface UseDistanceFilterProps {
  projectAddress: string | null;
  companies: Company[];
  enabled: boolean;
}

export function useDistanceFilter({
  projectAddress,
  companies,
  enabled
}: UseDistanceFilterProps) {
  const [maxDistance, setMaxDistance] = useState<number>(0); // 0 means show all
  const [distances, setDistances] = useState<{ [companyId: string]: number | null }>({});
  const [isCalculating, setIsCalculating] = useState(false);

  // Calculate distances when project address or companies change
  useEffect(() => {
    if (!enabled || !projectAddress || companies.length === 0) {
      setDistances({});
      return;
    }

    const calculateDistances = async () => {
      setIsCalculating(true);
      
      try {
        const companyAddresses = companies.map(company => ({
          id: company.id,
          address: company.address || ''
        }));

        const results = await distanceCalculator.calculateDistancesBetweenAddresses(
          projectAddress,
          companyAddresses
        );

        const distanceMap: { [companyId: string]: number | null } = {};
        results.forEach(result => {
          distanceMap[result.id] = result.distance;
        });

        setDistances(distanceMap);
      } catch (error) {
        console.error('Error calculating distances:', error);
        setDistances({});
      } finally {
        setIsCalculating(false);
      }
    };

    calculateDistances();
  }, [projectAddress, companies, enabled]);

  // Filter companies based on selected distance
  const filteredCompanies = useMemo(() => {
    if (maxDistance === 0) {
      return companies; // Show all companies when distance is 0
    }

    return companies.filter(company => {
      const distance = distances[company.id];
      // Include companies with no address (distance is null) to be inclusive
      return distance === null || distance <= maxDistance;
    });
  }, [companies, distances, maxDistance]);

  // Get stats for display
  const stats = useMemo(() => {
    const totalCompanies = companies.length;
    const filteredCount = filteredCompanies.length;
    const companiesWithDistance = Object.values(distances).filter(d => d !== null).length;
    
    return {
      total: totalCompanies,
      filtered: filteredCount,
      withDistance: companiesWithDistance,
      withoutDistance: totalCompanies - companiesWithDistance
    };
  }, [companies.length, filteredCompanies.length, distances]);

  return {
    maxDistance,
    setMaxDistance,
    filteredCompanies,
    distances,
    isCalculating,
    stats
  };
}