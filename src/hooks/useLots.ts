import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ProjectLot {
  id: string;
  project_id: string;
  lot_number: number;
  lot_name: string | null;
  created_at: string;
  updated_at: string;
}

export function useLots(projectId: string | undefined) {
  const queryClient = useQueryClient();

  const { data: lots = [], isLoading } = useQuery({
    queryKey: ['project-lots', projectId],
    queryFn: async () => {
      if (!projectId) return [];

      const { data, error } = await supabase
        .from('project_lots')
        .select('*')
        .eq('project_id', projectId)
        .order('lot_number', { ascending: true });

      if (error) throw error;
      return data as ProjectLot[];
    },
    enabled: !!projectId,
  });

  const initializeLots = useMutation({
    mutationFn: async (projectId: string) => {
      const { error } = await supabase.rpc('initialize_project_lots', {
        p_project_id: projectId
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-lots', projectId] });
      toast.success('Lots initialized successfully');
    },
    onError: (error) => {
      console.error('Error initializing lots:', error);
      toast.error('Failed to initialize lots');
    },
  });

  const createLot = useMutation({
    mutationFn: async ({ projectId, lotNumber, lotName }: { 
      projectId: string; 
      lotNumber: number; 
      lotName?: string;
    }) => {
      const { data, error } = await supabase
        .from('project_lots')
        .insert({
          project_id: projectId,
          lot_number: lotNumber,
          lot_name: lotName || `Lot ${lotNumber}`,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-lots', projectId] });
      toast.success('Lot created successfully');
    },
    onError: (error) => {
      console.error('Error creating lot:', error);
      toast.error('Failed to create lot');
    },
  });

  const updateLot = useMutation({
    mutationFn: async ({ lotId, lotName }: { lotId: string; lotName: string }) => {
      const { error } = await supabase
        .from('project_lots')
        .update({ lot_name: lotName })
        .eq('id', lotId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-lots', projectId] });
      toast.success('Lot updated successfully');
    },
    onError: (error) => {
      console.error('Error updating lot:', error);
      toast.error('Failed to update lot');
    },
  });

  const deleteLot = useMutation({
    mutationFn: async (lotId: string) => {
      const { error } = await supabase
        .from('project_lots')
        .delete()
        .eq('id', lotId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-lots', projectId] });
      toast.success('Lot deleted successfully');
    },
    onError: (error) => {
      console.error('Error deleting lot:', error);
      toast.error('Failed to delete lot');
    },
  });

  return {
    lots,
    isLoading,
    initializeLots,
    createLot,
    updateLot,
    deleteLot,
  };
}
