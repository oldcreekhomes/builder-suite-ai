import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useAnnotations(sheetId: string | null) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch annotations for current sheet
  const { data: annotations, refetch } = useQuery({
    queryKey: ['takeoff-annotations', sheetId],
    queryFn: async () => {
      if (!sheetId) return [];
      
      const { data, error } = await supabase
        .from('takeoff_annotations')
        .select('*')
        .eq('takeoff_sheet_id', sheetId);
      
      if (error) throw error;
      return data;
    },
    enabled: !!sheetId,
  });

  // Save annotation
  const saveAnnotation = useMutation({
    mutationFn: async (annotation: {
      takeoff_item_id: string;
      takeoff_sheet_id: string;
      annotation_type: string;
      geometry: any;
      color: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Determine owner_id (handle employees)
      const { data: userInfo } = await supabase.rpc('get_current_user_home_builder_info');
      const ownerId = userInfo?.[0]?.is_employee ? userInfo[0].home_builder_id : user.id;

      const { error } = await supabase
        .from('takeoff_annotations')
        .insert({
          ...annotation,
          owner_id: ownerId,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      refetch();
      toast({
        title: "Annotation saved",
        description: "Your mark has been saved",
      });
    },
    onError: (error) => {
      console.error('Error saving annotation:', error);
      toast({
        title: "Error",
        description: "Failed to save annotation",
        variant: "destructive",
      });
    },
  });

  // Delete annotation
  const deleteAnnotation = useMutation({
    mutationFn: async (annotationId: string) => {
      const { error } = await supabase
        .from('takeoff_annotations')
        .delete()
        .eq('id', annotationId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete annotation",
        variant: "destructive",
      });
    },
  });

  return {
    annotations: annotations || [],
    saveAnnotation: saveAnnotation.mutate,
    deleteAnnotation: deleteAnnotation.mutate,
    isSaving: saveAnnotation.isPending,
  };
}
