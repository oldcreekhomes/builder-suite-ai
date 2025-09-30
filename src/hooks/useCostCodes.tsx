
import { useState, useEffect, useRef } from 'react';
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

  const cleanupRan = useRef(false);

  const normalize = (v: any) => (v ?? '').toString().trim();

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

  // One-time cleanup: remove duplicate children with empty code when a non-empty sibling exists
  const cleanupDuplicateEmptyCodes = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('cost_codes')
        .select('id,name,parent_group,code');
      if (error) throw error;

      const groups = new Map<string, { nonEmpty: string[]; empty: string[] }>();
      (data || []).forEach((cc) => {
        const key = `${normalize(cc.parent_group)}|${normalize(cc.name).toLowerCase()}`;
        const isEmpty = normalize(cc.code) === '';
        const entry = groups.get(key) || { nonEmpty: [], empty: [] };
        (isEmpty ? entry.empty : entry.nonEmpty).push(cc.id);
        groups.set(key, entry);
      });

      const idsToDelete: string[] = [];
      groups.forEach((g) => {
        if (g.nonEmpty.length > 0 && g.empty.length > 0) {
          idsToDelete.push(...g.empty);
        }
      });

      if (idsToDelete.length > 0) {
        await supabase.from('cost_codes').delete().in('id', idsToDelete);
      }
    } catch (e) {
      console.error('Error during cost code cleanup:', e);
    }
  };
  // Add new cost code
  const addCostCode = async (costCodeData: any) => {
    if (!user) return;

    try {
      const parentGroupRaw = costCodeData.parentGroup ?? null;
      const parentGroup = parentGroupRaw ? normalize(parentGroupRaw) : null;
      const name = normalize(costCodeData.name);
      const codeStr = costCodeData.code !== undefined ? normalize(costCodeData.code) : '';

      const payload = {
        code: codeStr || null,
        name,
        category: parentGroup || "Uncategorized",
        parent_group: parentGroup,
        quantity: costCodeData.quantity ?? null,
        price: costCodeData.price ? parseFloat(costCodeData.price.toString()) : null,
        unit_of_measure: costCodeData.unitOfMeasure ?? null,
        has_specifications: costCodeData.hasSpecifications === 'yes',
        has_bidding: costCodeData.hasBidding === 'yes',
        has_subcategories: costCodeData.hasSubcategories === 'yes',
        owner_id: user.id,
      } as any;

      // Check for an existing child with the same parent + name that has an empty code
      let query = supabase.from('cost_codes').select('*').eq('name', name);
      if (parentGroup === null) {
        query = query.is('parent_group', null);
      } else {
        query = query.eq('parent_group', parentGroup);
      }
      const { data: existing, error: findErr } = await query;
      if (findErr) throw findErr;

      const emptyDup = (existing || []).find((cc) => normalize(cc.code) === '');
      let resultData: any = null;

      if (emptyDup) {
        const { data: updated, error: updErr } = await supabase
          .from('cost_codes')
          .update(payload)
          .eq('id', emptyDup.id)
          .select()
          .single();
        if (updErr) throw updErr;
        resultData = updated;

        // Clean up any other extra empties under same parent+name
        const extraEmptyIds = (existing || [])
          .filter((cc) => cc.id !== emptyDup.id && normalize(cc.code) === '')
          .map((cc) => cc.id);
        if (extraEmptyIds.length > 0) {
          await supabase.from('cost_codes').delete().in('id', extraEmptyIds);
        }
      } else {
        const { data: inserted, error: insErr } = await supabase
          .from('cost_codes')
          .insert(payload)
          .select()
          .single();
        if (insErr) throw insErr;
        resultData = inserted;
      }

      await fetchCostCodes();
      toast({ title: 'Success', description: 'Cost code saved' });
    } catch (error) {
      console.error('Error adding cost code:', error);
      toast({
        title: 'Error',
        description: 'Failed to add cost code',
        variant: 'destructive',
      });
    }
  };

  // Update cost code - improved to prevent UI flickering
  const updateCostCode = async (id: string, updates: any) => {
    try {
      // Helper to normalize boolean values from 'yes'/'no' strings or actual booleans
      const toBool = (v: any) => (typeof v === 'string' ? v === 'yes' : Boolean(v));

      // Prepare the update data with proper type handling
      const updateData: any = {};

      if (updates.code !== undefined) updateData.code = updates.code;
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.category !== undefined) updateData.category = updates.category;
      if (updates.parent_group !== undefined) updateData.parent_group = updates.parent_group;
      if (updates.quantity !== undefined) updateData.quantity = updates.quantity;
      if (updates.price !== undefined)
        updateData.price = updates.price ? parseFloat(updates.price.toString()) : null;
      if (updates.unit_of_measure !== undefined) updateData.unit_of_measure = updates.unit_of_measure;
      if (updates.has_specifications !== undefined)
        updateData.has_specifications = toBool(updates.has_specifications);
      if (updates.has_bidding !== undefined) updateData.has_bidding = toBool(updates.has_bidding);
      if (updates.has_subcategories !== undefined)
        updateData.has_subcategories = toBool(updates.has_subcategories);

      updateData.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('cost_codes')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Update with the actual data from the server - single atomic update
      setCostCodes((prev) => prev.map((cc) => (cc.id === id ? data : cc)));
      await fetchCostCodes();
    } catch (error) {
      console.error('Error updating cost code:', error);
      toast({
        title: 'Error',
        description: 'Failed to update cost code',
        variant: 'destructive',
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
      const costCodesToInsert = importedCostCodes.map((code) => ({
        code: code.code,
        name: code.name,
        category: code.parentGroup || 'Uncategorized',
        parent_group: code.parentGroup || null,
        quantity: code.quantity || null,
        price: code.price ? parseFloat(code.price) : null,
        unit_of_measure: code.unitOfMeasure || null,
        has_specifications: code.hasSpecifications === 'yes',
        has_bidding: code.hasBidding === 'yes',
        has_subcategories: code.hasSubcategories === 'yes',
        owner_id: user.id,
      }));

      const { data, error } = await supabase
        .from('cost_codes')
        .insert(costCodesToInsert)
        .select();

      if (error) throw error;

      await fetchCostCodes();
      toast({
        title: 'Success',
        description: `Imported ${data?.length || 0} cost codes successfully`,
      });
    } catch (error) {
      console.error('Error importing cost codes:', error);
      toast({
        title: 'Error',
        description: 'Failed to import cost codes',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    fetchCostCodes();
  }, [user]);

  // Run one-time cleanup after initial fetch
  useEffect(() => {
    if (!user || cleanupRan.current) return;
    cleanupRan.current = true;
    (async () => {
      try {
        await cleanupDuplicateEmptyCodes();
        await fetchCostCodes();
      } catch (e) {
        console.error('Cleanup error:', e);
      }
    })();
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
