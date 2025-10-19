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
      queryClient.invalidateQueries({ queryKey: ['takeoff-items', sheetId] });
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

  return {
    handleDeleteItems,
    isDeleting: deleteMutation.isPending,
  };
}
