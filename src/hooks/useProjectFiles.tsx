
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

      // First get the files
      const { data: filesData, error } = await supabase
        .from('project_files')
        .select('*')
        .eq('project_id', projectId)
        .eq('is_deleted', false)
        .order('uploaded_at', { ascending: false });

      if (error) {
        console.error('Error fetching project files:', error);
        throw error;
      }

      if (!filesData || filesData.length === 0) {
        return [];
      }

      // Get unique uploaded_by IDs
      const uploaderIds = [...new Set(filesData.map(file => file.uploaded_by))];
      
      // Get uploader info from both users and employees tables
      const [usersData, employeesData] = await Promise.all([
        supabase
          .from('users')
          .select('id, email')
          .in('id', uploaderIds),
        supabase
          .from('employees')
          .select('id, email')
          .in('id', uploaderIds)
      ]);

      // Create a map of uploader info
      const uploaderMap = new Map();
      usersData.data?.forEach(user => uploaderMap.set(user.id, { email: user.email }));
      employeesData.data?.forEach(employee => uploaderMap.set(employee.id, { email: employee.email }));

      // Combine files with uploader info
      const filesWithUploaders = filesData.map(file => ({
        ...file,
        uploaded_by_profile: uploaderMap.get(file.uploaded_by) || { email: 'Unknown' }
      }));

      return filesWithUploaders as (ProjectFile & { uploaded_by_profile: { email: string } })[];
    },
    enabled: !!user && !!projectId,
  });
};
