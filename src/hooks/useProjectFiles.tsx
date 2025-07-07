
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface ProjectFile {
  id: string;
  project_id: string;
  filename: string;
  original_filename: string;
  file_size: number;
  file_type: string;
  mime_type: string;
  storage_path: string;
  uploaded_by: string;
  uploaded_at: string;
  updated_at: string;
  description: string | null;
  is_deleted: boolean;
}

export const useProjectFiles = (projectId: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['project-files', projectId, user?.id],
    queryFn: async () => {
      if (!user || !projectId) return [];

      const { data, error } = await supabase
        .from('project_files')
        .select(`
          *,
          uploaded_by_profile:home_builders!project_files_uploaded_by_fkey(email)
        `)
        .eq('project_id', projectId)
        .eq('is_deleted', false)
        .order('uploaded_at', { ascending: false });

      if (error) {
        console.error('Error fetching project files:', error);
        throw error;
      }

      return data as (ProjectFile & { uploaded_by_profile: { email: string } })[];
    },
    enabled: !!user && !!projectId,
  });
};
