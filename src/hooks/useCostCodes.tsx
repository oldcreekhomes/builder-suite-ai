
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
  const addCostCode = async (costCodeData: CostCodeInsert) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('cost_codes')
        .insert({
          ...costCodeData,
          owner_id: user.id,
          has_specifications: costCodeData.has_specifications === 'yes',
          has_bidding: costCodeData.has_bidding === 'yes',
          price: costCodeData.price ? parseFloat(costCodeData.price.toString()) : null,
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

  // Update cost code
  const updateCostCode = async (id: string, updates: CostCodeUpdate) => {
    try {
      const { data, error } = await supabase
        .from('cost_codes')
        .update({
          ...updates,
          has_specifications: updates.has_specifications === 'yes',
          has_bidding: updates.has_bidding === 'yes',
          price: updates.price ? parseFloat(updates.price.toString()) : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      setCostCodes(prev => prev.map(cc => cc.id === id ? data : cc));
      toast({
        title: "Success",
        description: "Cost code updated successfully",
      });
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

      if (error) throw error;
      
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
