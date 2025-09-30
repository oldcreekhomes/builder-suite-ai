
import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CostCode {
  id: string;
  code: string;
  name: string;
  unit_of_measure: string;
  category: string;
  parent_group: string;
  has_bidding: boolean;
  has_specifications: boolean;
  has_subcategories: boolean;
  owner_id: string;
  price: number;
  quantity: string;
  created_at: string;
  updated_at: string;
}

export const useAddBiddingModal = (projectId: string, existingCostCodeIds: string[]) => {
  const [selectedCostCodes, setSelectedCostCodes] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [groupedCostCodes, setGroupedCostCodes] = useState<Record<string, CostCode[]>>({});
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch cost codes that have bidding enabled and are not already in the project
  const { data: costCodes = [] } = useQuery({
    queryKey: ['cost-codes-for-bidding', projectId, existingCostCodeIds],
    queryFn: async () => {
      let query = supabase
        .from('cost_codes')
        .select('*')
        .eq('has_bidding', true);

      // Only add the exclusion filter if there are existing cost code IDs
      if (existingCostCodeIds.length > 0) {
        query = query.not('id', 'in', `(${existingCostCodeIds.join(',')})`);
      }

      const { data, error } = await query.order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching cost codes:', error);
        throw error;
      }

      // Transform the data to handle nullable values
      return (data || []).map(costCode => ({
        ...costCode,
        unit_of_measure: costCode.unit_of_measure || '',
        category: costCode.category || 'Uncategorized',
        parent_group: costCode.parent_group || 'General',
        price: costCode.price || 0,
        quantity: costCode.quantity || '',
        has_specifications: costCode.has_specifications || false,
        has_subcategories: costCode.has_subcategories || false
      }));
    },
    enabled: !!projectId,
  });

  // Group cost codes by parent_group or category
  useEffect(() => {
    const grouped = costCodes.reduce((acc, costCode) => {
      const group = costCode.parent_group || costCode.category || 'Uncategorized';
      if (!acc[group]) {
        acc[group] = [];
      }
      acc[group].push(costCode);
      return acc;
    }, {} as Record<string, CostCode[]>);

    // Sort each group by cost code number
    Object.keys(grouped).forEach(group => {
      grouped[group].sort((a, b) => {
        // Extract numeric part from cost code for proper numerical sorting
        const getNumericCode = (code: string) => {
          const match = code.match(/(\d+)/);
          return match ? parseInt(match[1], 10) : 0;
        };
        return getNumericCode(a.code) - getNumericCode(b.code);
      });
    });

    setGroupedCostCodes(grouped);
  }, [costCodes]);

  // Create bidding items mutation
  const createBiddingItems = useMutation({
    mutationFn: async (costCodeIds: string[]) => {
      // First, fetch specifications for the selected cost codes
      const { data: specifications, error: specsError } = await supabase
        .from('cost_code_specifications')
        .select('cost_code_id, description, files')
        .in('cost_code_id', costCodeIds);

      if (specsError) {
        console.error('Error fetching specifications:', specsError);
      }

      // Create a map of cost_code_id to specifications
      const specsMap = new Map();
      specifications?.forEach(spec => {
        specsMap.set(spec.cost_code_id, {
          description: spec.description,
          files: spec.files || []
        });
      });

      // Create the project bidding items with specifications data
      const biddingItems = costCodeIds.map(costCodeId => {
        const specs = specsMap.get(costCodeId);
        const costCode = costCodes.find(cc => cc.id === costCodeId);
        const bidPackageName = costCode ? `${costCode.code} - ${costCode.name}` : `Bid Package for ${costCodeId}`;
        
        return {
          project_id: projectId,
          cost_code_id: costCodeId,
          status: 'draft',
          name: bidPackageName,
          specifications: specs?.description || null,
          files: specs?.files || []
        };
      });

      const { data: insertedBiddingItems, error: biddingError } = await supabase
        .from('project_bid_packages')
        .insert(biddingItems)
        .select('id, cost_code_id');

      if (biddingError) throw biddingError;

      // Get all companies associated with the selected cost codes
      const { data: companyCostCodes, error: companyError } = await supabase
        .from('company_cost_codes')
        .select('company_id, cost_code_id')
        .in('cost_code_id', costCodeIds);

      if (companyError) throw companyError;

      // Create project_bids entries
      if (companyCostCodes && companyCostCodes.length > 0) {
        const biddingCompanies = [];
        
        // For each company/cost code combination, find the corresponding bidding item
        for (const companyCostCode of companyCostCodes) {
          const biddingItem = insertedBiddingItems?.find(
            item => item.cost_code_id === companyCostCode.cost_code_id
          );
          
          if (biddingItem) {
            biddingCompanies.push({
              bid_package_id: biddingItem.id,
              company_id: companyCostCode.company_id,
              bid_status: null
            });
          }
        }

        if (biddingCompanies.length > 0) {
          const { error: companyBiddingError } = await supabase
            .from('project_bids')
            .insert(biddingCompanies);

          if (companyBiddingError) throw companyBiddingError;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-bidding', projectId] });
      queryClient.invalidateQueries({ queryKey: ['all-project-bidding', projectId] });
      queryClient.invalidateQueries({ queryKey: ['bidding-counts', projectId] });
      toast({
        title: "Success",
        description: "Bidding items and associated companies loaded successfully",
      });
      setSelectedCostCodes(new Set());
    },
    onError: (error) => {
      console.error('Error creating bidding items:', error);
      toast({
        title: "Error",
        description: "Failed to create bidding items",
        variant: "destructive",
      });
    },
  });

  const handleCostCodeToggle = (costCodeId: string) => {
    const newSelection = new Set(selectedCostCodes);
    if (newSelection.has(costCodeId)) {
      newSelection.delete(costCodeId);
    } else {
      newSelection.add(costCodeId);
    }
    setSelectedCostCodes(newSelection);
  };

  const handleGroupCheckboxChange = (group: string, checked: boolean) => {
    const groupCostCodes = groupedCostCodes[group] || [];
    const newSelection = new Set(selectedCostCodes);
    
    groupCostCodes.forEach(costCode => {
      if (checked) {
        newSelection.add(costCode.id);
      } else {
        newSelection.delete(costCode.id);
      }
    });
    
    setSelectedCostCodes(newSelection);
  };

  const isGroupSelected = (group: string) => {
    const groupCostCodes = groupedCostCodes[group] || [];
    return groupCostCodes.length > 0 && groupCostCodes.every(costCode => selectedCostCodes.has(costCode.id));
  };

  const isGroupPartiallySelected = (group: string) => {
    const groupCostCodes = groupedCostCodes[group] || [];
    const selectedInGroup = groupCostCodes.filter(costCode => selectedCostCodes.has(costCode.id));
    return selectedInGroup.length > 0 && selectedInGroup.length < groupCostCodes.length;
  };

  const handleExpandAll = () => {
    setExpandedGroups(new Set(Object.keys(groupedCostCodes)));
  };

  const handleCollapseAll = () => {
    setExpandedGroups(new Set());
  };

  const handleGroupToggle = (group: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(group)) {
      newExpanded.delete(group);
    } else {
      newExpanded.add(group);
    }
    setExpandedGroups(newExpanded);
  };

  const handleSave = () => {
    if (selectedCostCodes.size > 0) {
      createBiddingItems.mutate(Array.from(selectedCostCodes));
    }
  };

  const resetSelection = () => {
    setSelectedCostCodes(new Set());
  };

  return {
    selectedCostCodes,
    expandedGroups,
    groupedCostCodes,
    createBiddingItems,
    handleCostCodeToggle,
    handleGroupCheckboxChange,
    isGroupSelected,
    isGroupPartiallySelected,
    handleExpandAll,
    handleCollapseAll,
    handleGroupToggle,
    handleSave,
    resetSelection,
  };
};
