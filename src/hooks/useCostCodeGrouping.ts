
import { useMemo, useCallback } from 'react';
import type { Tables } from '@/integrations/supabase/types';

type CostCode = Tables<'cost_codes'>;

export const useCostCodeGrouping = (costCodes: CostCode[]) => {
  // Find all parent codes - these are codes that:
  // 1. Other codes reference as parent_group, OR
  // 2. Have has_subcategories set to true
  const parentCodes = useMemo(() => {
    const parents = new Set<string>();
    costCodes.forEach(cc => {
      // Add to parents if it's referenced as a parent_group
      if (cc.parent_group) {
        parents.add(cc.parent_group);
      }
      // Add to parents if it has has_subcategories enabled
      if (cc.has_subcategories) {
        parents.add(cc.code);
      }
    });
    return parents;
  }, [costCodes]);

  // Group cost codes by their parent group or by code prefix
  const groupedCostCodes = useMemo(() => {
    const groups: Record<string, CostCode[]> = {};
    
    costCodes.forEach(costCode => {
      let groupKey = 'ungrouped';
      
      // If this IS a parent code AND has no parent itself, it goes in its own group
      if (parentCodes.has(costCode.code) && (!costCode.parent_group || costCode.parent_group.trim() === '')) {
        groupKey = costCode.code;
      }
      // If this is a parent code WITH a parent, skip it as a child item - it will only appear as a group header
      else if (parentCodes.has(costCode.code) && costCode.parent_group && costCode.parent_group.trim() !== '') {
        // Don't add this to any group as a child item
        return;
      }
      // Otherwise, check if it has an explicit parent_group
      else if (costCode.parent_group && costCode.parent_group.trim() !== '') {
        groupKey = costCode.parent_group;
      } 
      // If no explicit parent_group, try to find a matching parent by prefix
      else {
        const matchingParent = Array.from(parentCodes).find(parentCode => {
          return costCode.code.startsWith(parentCode) && costCode.code !== parentCode;
        });
        
        if (matchingParent) {
          groupKey = matchingParent;
        }
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(costCode);
    });
    
    // Sort each group's cost codes by code for consistency
    Object.keys(groups).forEach(groupKey => {
      groups[groupKey].sort((a, b) => a.code.localeCompare(b.code));
    });
    
    return groups;
  }, [costCodes, parentCodes]);

  // Get parent cost code details for group headers
  const getParentCostCode = useCallback((parentGroupCode: string) => {
    return costCodes.find(cc => cc.code === parentGroupCode);
  }, [costCodes]);

  return {
    parentCodes,
    groupedCostCodes,
    getParentCostCode
  };
};
