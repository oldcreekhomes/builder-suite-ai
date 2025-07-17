import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface ProjectFolder {
  id: string;
  project_id: string;
  folder_path: string;
  parent_path: string | null;
  folder_name: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export const useProjectFolders = (projectId: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['project-folders', projectId, user?.id],
    queryFn: async () => {
      if (!user || !projectId) return [];

      const { data, error } = await supabase
        .from('project_folders')
        .select('*')
        .eq('project_id', projectId)
        .order('folder_path', { ascending: true });

      if (error) {
        console.error('Error fetching project folders:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!user && !!projectId,
  });
};

export const useCreateFolder = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ projectId, folderName, parentPath }: {
      projectId: string;
      folderName: string;
      parentPath?: string;
    }) => {
      if (!user) throw new Error('User not authenticated');

      const folderPath = parentPath ? `${parentPath}/${folderName}` : folderName;

      const { data, error } = await supabase
        .from('project_folders')
        .insert({
          project_id: projectId,
          folder_path: folderPath,
          parent_path: parentPath || null,
          folder_name: folderName,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project-folders', variables.projectId] });
      toast.success('Folder created successfully');
    },
    onError: (error) => {
      console.error('Error creating folder:', error);
      toast.error('Failed to create folder');
    },
  });
};

export const useDeleteFolder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, folderPath }: {
      projectId: string;
      folderPath: string;
    }) => {
      // Delete the folder and all its subfolders
      const { error } = await supabase
        .from('project_folders')
        .delete()
        .eq('project_id', projectId)
        .or(`folder_path.eq.${folderPath},folder_path.like.${folderPath}/%`);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project-folders', variables.projectId] });
      toast.success('Folder deleted successfully');
    },
    onError: (error) => {
      console.error('Error deleting folder:', error);
      toast.error('Failed to delete folder');
    },
  });
};