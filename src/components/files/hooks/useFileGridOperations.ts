
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export function useFileGridOperations(onRefresh: () => void) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  const uploadFileToFolder = async (file: File, folderName: string) => {
    if (!user) return false;

    const fileId = crypto.randomUUID();
    const relativePath = folderName === 'Root' ? file.name : `${folderName}/${file.name}`;
    const fileName = `${user.id}/${window.location.pathname.split('/')[2]}/${fileId}_${relativePath}`;
    
    try {
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('project-files')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('project_files')
        .insert({
          project_id: window.location.pathname.split('/')[2],
          filename: fileName,
          original_filename: relativePath,
          file_size: file.size,
          file_type: file.name.split('.').pop()?.toLowerCase() || 'unknown',
          mime_type: file.type,
          storage_path: uploadData.path,
          uploaded_by: user.id,
        });

      if (dbError) throw dbError;
      return true;
    } catch (error) {
      console.error('Upload error:', error);
      return false;
    }
  };

  const handleSelectAll = (checked: boolean, files: any[]) => {
    if (checked) {
      setSelectedFiles(new Set(files.map(file => file.id)));
    } else {
      setSelectedFiles(new Set());
    }
  };

  const handleSelectFile = (fileId: string, checked: boolean) => {
    const newSelected = new Set(selectedFiles);
    if (checked) {
      newSelected.add(fileId);
    } else {
      newSelected.delete(fileId);
    }
    setSelectedFiles(newSelected);
  };

  const handleBulkDelete = async () => {
    if (selectedFiles.size === 0) return;
    
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('project_files')
        .update({ is_deleted: true, updated_at: new Date().toISOString() })
        .in('id', Array.from(selectedFiles));

      if (error) throw error;

      toast({
        title: "Success",
        description: `${selectedFiles.size} file(s) deleted successfully`,
      });
      setSelectedFiles(new Set());
      onRefresh();
    } catch (error) {
      console.error('Bulk delete error:', error);
      toast({
        title: "Delete Error",
        description: "Failed to delete selected files",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    selectedFiles,
    isDeleting,
    uploadFileToFolder,
    handleSelectAll,
    handleSelectFile,
    handleBulkDelete,
  };
}
