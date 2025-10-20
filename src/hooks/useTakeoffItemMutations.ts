import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useTakeoffItemMutations(sheetId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const deleteMutation = useMutation({
    mutationFn: async (itemIds: string[]) => {
      const { error } = await supabase
        .from('takeoff_items')
        .delete()
        .in('id', itemIds);
      
      if (error) throw error;
      return itemIds;
    },
    onSuccess: (itemIds) => {
      // Invalidate items query
      queryClient.invalidateQueries({ queryKey: ['takeoff-items', sheetId] });
      
      // IMPORTANT: Also invalidate annotations query
      // When items are deleted, their annotations are CASCADE deleted in the database
      // We need to refresh the cache so the overlays disappear
      queryClient.invalidateQueries({ queryKey: ['takeoff-annotations', sheetId] });
      
      toast({
        title: "Success",
        description: `${itemIds.length} item${itemIds.length > 1 ? 's' : ''} deleted successfully`,
      });
    },
    onError: (error) => {
      console.error('Error deleting items:', error);
      toast({
        title: "Error",
        description: "Failed to delete items",
        variant: "destructive",
      });
    },
  });

  const handleDeleteItems = (itemIds: string[]) => {
    deleteMutation.mutate(itemIds);
  };

  const updateQuantityMutation = useMutation({
    mutationFn: async ({ itemId, quantity }: { itemId: string; quantity: number }) => {
      // Get current unit_price to calculate new total_cost
      const { data: item } = await supabase
        .from('takeoff_items')
        .select('unit_price')
        .eq('id', itemId)
        .single();
      
      const totalCost = (item?.unit_price || 0) * quantity;
      
      const { error } = await supabase
        .from('takeoff_items')
        .update({ 
          quantity,
          total_cost: totalCost
        })
        .eq('id', itemId);
      
      if (error) throw error;
      return { itemId, quantity };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['takeoff-items', sheetId] });
      toast({
        title: "Success",
        description: "Quantity updated successfully",
      });
    },
    onError: (error) => {
      console.error('Error updating quantity:', error);
      toast({
        title: "Error",
        description: "Failed to update quantity",
        variant: "destructive",
      });
    },
  });

  const handleUpdateQuantity = (itemId: string, quantity: number) => {
    updateQuantityMutation.mutate({ itemId, quantity });
  };

  return {
    handleDeleteItems,
    isDeleting: deleteMutation.isPending,
    handleUpdateQuantity,
    isUpdating: updateQuantityMutation.isPending,
  };
}
