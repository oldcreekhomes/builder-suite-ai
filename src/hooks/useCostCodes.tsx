import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

type CostCode = Tables<'cost_codes'>;
type CostCodeInsert = Omit<TablesInsert<'cost_codes'>, 'owner_id'>;
type CostCodeUpdate = TablesUpdate<'cost_codes'>;

export const useCostCodes = () => {
  const [costCodes, setCostCodes] = useState<CostCode[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch cost codes from database
  const fetchCostCodes = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('cost_codes')
        .select('*')
        .order('code');

      if (error) throw error;
      setCostCodes(data || []);
    } catch (error) {
      console.error('Error fetching cost codes:', error);
      toast({
        title: "Error",
        description: "Failed to load cost codes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Add new cost code
  const addCostCode = async (costCodeData: any) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('cost_codes')
        .insert({
          code: costCodeData.code,
          name: costCodeData.name,
          category: costCodeData.parentGroup || "Uncategorized",
          parent_group: costCodeData.parentGroup || null,
          quantity: costCodeData.quantity || null,
          price: costCodeData.price ? parseFloat(costCodeData.price.toString()) : null,
          unit_of_measure: costCodeData.unitOfMeasure || null,
          has_specifications: costCodeData.hasSpecifications === 'yes',
          has_bidding: costCodeData.hasBidding === 'yes',
          owner_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      
      setCostCodes(prev => [...prev, data]);
      toast({
        title: "Success",
        description: "Cost code added successfully",
      });
    } catch (error) {
      console.error('Error adding cost code:', error);
      toast({
        title: "Error",
        description: "Failed to add cost code",
        variant: "destructive",
      });
    }
  };

  // Update cost code - optimized to maintain data structure
  const updateCostCode = async (id: string, updates: any) => {
    try {
      // Optimistically update the UI first
      setCostCodes(prev => prev.map(cc => {
        if (cc.id === id) {
          return { ...cc, ...updates };
        }
        return cc;
      }));

      // Prepare the update data with proper type handling
      const updateData: any = {};
      
      if (updates.code !== undefined) updateData.code = updates.code;
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.category !== undefined) updateData.category = updates.category;
      if (updates.parent_group !== undefined) updateData.parent_group = updates.parent_group;
      if (updates.quantity !== undefined) updateData.quantity = updates.quantity;
      if (updates.price !== undefined) updateData.price = updates.price ? parseFloat(updates.price.toString()) : null;
      if (updates.unit_of_measure !== undefined) updateData.unit_of_measure = updates.unit_of_measure;
      if (updates.has_specifications !== undefined) updateData.has_specifications = Boolean(updates.has_specifications);
      if (updates.has_bidding !== undefined) updateData.has_bidding = Boolean(updates.has_bidding);
      
      updateData.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('cost_codes')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        // Revert optimistic update on error
        await fetchCostCodes();
        throw error;
      }
      
      // Update with the actual data from the server
      setCostCodes(prev => prev.map(cc => cc.id === id ? data : cc));
      
    } catch (error) {
      console.error('Error updating cost code:', error);
      toast({
        title: "Error",
        description: "Failed to update cost code",
        variant: "destructive",
      });
    }
  };

  // Delete cost code
  const deleteCostCode = async (id: string) => {
    try {
      const { error } = await supabase
        .from('cost_codes')
        .delete()
        .eq('id', id);

      if (error) {
        // Check if it's a foreign key constraint error
        if (error.code === '23503' && error.message.includes('project_budgets')) {
          toast({
            title: "Cannot Delete Cost Code",
            description: "This cost code is being used in project budgets and cannot be deleted. Please remove it from all project budgets first.",
            variant: "destructive",
          });
          return;
        }
        throw error;
      }
      
      setCostCodes(prev => prev.filter(cc => cc.id !== id));
      toast({
        title: "Success",
        description: "Cost code deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting cost code:', error);
      toast({
        title: "Error",
        description: "Failed to delete cost code",
        variant: "destructive",
      });
    }
  };

  // Import multiple cost codes
  const importCostCodes = async (importedCostCodes: any[]) => {
    if (!user) return;

    try {
      const costCodesToInsert = importedCostCodes.map(code => ({
        code: code.code,
        name: code.name,
        category: code.parentGroup || "Uncategorized",
        parent_group: code.parentGroup || null,
        quantity: code.quantity || null,
        price: code.price ? parseFloat(code.price) : null,
        unit_of_measure: code.unitOfMeasure || null,
        has_specifications: code.hasSpecifications === 'yes',
        has_bidding: code.hasBidding === 'yes',
        owner_id: user.id,
      }));

      const { data, error } = await supabase
        .from('cost_codes')
        .insert(costCodesToInsert)
        .select();

      if (error) throw error;
      
      setCostCodes(prev => [...prev, ...(data || [])]);
      toast({
        title: "Success",
        description: `Imported ${data?.length || 0} cost codes successfully`,
      });
    } catch (error) {
      console.error('Error importing cost codes:', error);
      toast({
        title: "Error",
        description: "Failed to import cost codes",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchCostCodes();
  }, [user]);

  return {
    costCodes,
    loading,
    addCostCode,
    updateCostCode,
    deleteCostCode,
    importCostCodes,
    refetch: fetchCostCodes,
  };
};
