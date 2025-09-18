import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { distanceCalculator } from '@/utils/distanceCalculation';

interface CostCode {
  id: string;
  code: string;
  name: string;
  unit_of_measure: string;
  category: string;
  parent_group: string;
  has_bidding: boolean;
  has_specifications: boolean;
  owner_id: string;
  price: number;
  quantity: string;
  created_at: string;
  updated_at: string;
}

interface Company {
  id: string;
  company_name: string;
  address: string;
}

interface UseCostCodeDistanceFilterProps {
  projectAddress: string | null;
  groupedCostCodes: Record<string, CostCode[]>;
  enabled: boolean;
}

export const useCostCodeDistanceFilter = ({
  projectAddress,
  groupedCostCodes,
  enabled
}: UseCostCodeDistanceFilterProps) => {
  const [maxDistance, setMaxDistance] = useState<number>(0); // 0 means show all
  const [distances, setDistances] = useState<Map<string, number | null>>(new Map());
  const [isCalculating, setIsCalculating] = useState(false);

  // Get all cost code IDs from grouped cost codes
  const allCostCodeIds = useMemo(() => {
    return Object.values(groupedCostCodes).flat().map(cc => cc.id);
  }, [groupedCostCodes]);

  // Fetch companies that work on the cost codes
  const { data: companyCostCodes = [] } = useQuery({
    queryKey: ['company-cost-codes', allCostCodeIds],
    queryFn: async () => {
      if (allCostCodeIds.length === 0) return [];

      const { data, error } = await supabase
        .from('company_cost_codes')
        .select(`
          cost_code_id,
          company_id,
          companies!company_cost_codes_company_id_fkey (
            id,
            company_name,
            address
          )
        `)
        .in('cost_code_id', allCostCodeIds);

      if (error) throw error;

      return data || [];
    },
    enabled: enabled && allCostCodeIds.length > 0,
  });

  // Calculate distances when project address or companies change
  useEffect(() => {
    const calculateDistances = async () => {
      if (!projectAddress || !enabled || maxDistance === 0 || companyCostCodes.length === 0) {
        setDistances(new Map());
        return;
      }

      setIsCalculating(true);

      try {
        // Get unique companies with addresses
        const uniqueCompanies = Array.from(
          new Map(
            companyCostCodes
              .map(cc => cc.companies)
              .filter(company => company && company.address)
              .map(company => [company.id, company])
          ).values()
        );

        const companyAddresses = uniqueCompanies.map(company => ({
          id: company.id,
          address: company.address
        }));

        if (companyAddresses.length === 0) {
          setDistances(new Map());
          return;
        }

        const calculatedDistances = await distanceCalculator.calculateDistancesBetweenAddresses(
          projectAddress,
          companyAddresses
        );

        const distanceMap = new Map<string, number | null>();
        calculatedDistances.forEach(({ id, distance }) => {
          distanceMap.set(id, distance);
        });

        setDistances(distanceMap);
      } catch (error) {
        console.error('Error calculating distances:', error);
        setDistances(new Map());
      } finally {
        setIsCalculating(false);
      }
    };

    calculateDistances();
  }, [projectAddress, companyCostCodes, enabled, maxDistance]);

  // Filter grouped cost codes based on distance
  const filteredGroupedCostCodes = useMemo(() => {
    if (maxDistance === 0 || !enabled || distances.size === 0) {
      return groupedCostCodes;
    }

    const filtered: Record<string, CostCode[]> = {};

    Object.entries(groupedCostCodes).forEach(([group, costCodes]) => {
      const filteredCostCodes = costCodes.filter(costCode => {
        // Find companies that work on this cost code
        const costCodeCompanies = companyCostCodes.filter(
          cc => cc.cost_code_id === costCode.id
        );

        // Check if any company is within the distance limit
        return costCodeCompanies.some(cc => {
          const companyDistance = distances.get(cc.companies.id);
          return companyDistance !== null && companyDistance <= maxDistance;
        });
      });

      if (filteredCostCodes.length > 0) {
        filtered[group] = filteredCostCodes;
      }
    });

    return filtered;
  }, [groupedCostCodes, maxDistance, distances, companyCostCodes, enabled]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalCostCodes = Object.values(groupedCostCodes).flat().length;
    const filteredCostCodes = Object.values(filteredGroupedCostCodes).flat().length;
    const totalCompanies = new Set(companyCostCodes.map(cc => cc.companies.id)).size;
    const companiesWithDistance = Array.from(distances.values()).filter(d => d !== null).length;

    return {
      totalCostCodes,
      filteredCostCodes,
      totalCompanies,
      companiesWithDistance
    };
  }, [groupedCostCodes, filteredGroupedCostCodes, companyCostCodes, distances]);

  return {
    maxDistance,
    setMaxDistance,
    filteredGroupedCostCodes,
    distances,
    isCalculating,
    stats
  };
};