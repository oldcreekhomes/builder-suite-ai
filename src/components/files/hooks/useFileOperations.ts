import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export const useFileOperations = (onRefresh: () => void) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [selectedFolders, setSelectedFolders] = useState<Set<string>>(new Set());

  const uploadFileToFolder = async (file: File, relativePath: string) => {
    if (!user) return false;

    const fileId = crypto.randomUUID();
    const fileName = `${user.id}/${window.location.pathname.split('/')[2]}/${fileId}_${relativePath}`;
    
    try {
      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('project-files')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Save file metadata to database - CRITICAL: Explicitly set is_deleted to false
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
          is_deleted: false,
        });

      if (dbError) throw dbError;
      return true;
    } catch (error) {
      console.error('Upload error:', error);
      return false;
    }
  };

  const handleDownload = async (file: any) => {
    try {
      const { data, error } = await supabase.storage
        .from('project-files')
        .download(file.storage_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.original_filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download Error",
        description: "Failed to download file",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (file: any) => {
    try {
      const { error } = await supabase
        .from('project_files')
        .update({ is_deleted: true, updated_at: new Date().toISOString() })
        .eq('id', file.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "File deleted successfully",
      });
      onRefresh();
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Delete Error",
        description: "Failed to delete file",
        variant: "destructive",
      });
    }
  };

  const moveFileToFolder = async (fileId: string, targetFolder: string): Promise<boolean> => {
    if (!user) return false;

    try {
      // Get the current file data
      const { data: fileData, error: fetchError } = await supabase
        .from('project_files')
        .select('*')
        .eq('id', fileId)
        .single();

      if (fetchError) throw fetchError;

      // Calculate the new filename path
      let newFilename: string;
      const originalFileName = fileData.original_filename.split('/').pop() || fileData.original_filename;
      
      if (targetFolder === '__LOOSE_FILES__') {
        // Moving to root - just use the original filename
        newFilename = originalFileName;
      } else {
        // Moving to a folder - prepend the folder path
        newFilename = `${targetFolder}/${originalFileName}`;
      }

      // Don't move if it's already in the target folder
      if (fileData.original_filename === newFilename) {
        return false;
      }

      // Update the file's path in the database
      const { error: updateError } = await supabase
        .from('project_files')
        .update({ 
          original_filename: newFilename,
          updated_at: new Date().toISOString()
        })
        .eq('id', fileId);

      if (updateError) throw updateError;

      return true;
    } catch (error) {
      console.error('Error moving file:', error);
      toast({
        title: "Error",
        description: "Failed to move file",
        variant: "destructive",
      });
      return false;
    }
  };

  const handleFolderDelete = async (folderPath: string) => {
    const projectId = window.location.pathname.split('/')[2];
    try {
      setIsDeleting(true);
      
      // Delete all files in the folder (including nested folders) - CRITICAL: Scope by project_id
      const { error } = await supabase
        .from('project_files')
        .update({ is_deleted: true, updated_at: new Date().toISOString() })
        .eq('project_id', projectId)
        .like('original_filename', `${folderPath}%`);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Folder "${folderPath}" and all its contents deleted successfully`,
      });
      
      // Remove from selected folders
      const newSelectedFolders = new Set(selectedFolders);
      newSelectedFolders.delete(folderPath);
      setSelectedFolders(newSelectedFolders);
      
      onRefresh();
    } catch (error) {
      console.error('Folder delete error:', error);
      toast({
        title: "Delete Error",
        description: "Failed to delete folder",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedFiles.size === 0 && selectedFolders.size === 0) return;
    
    setIsDeleting(true);
    try {
      // Delete selected files
      if (selectedFiles.size > 0) {
        const { error: filesError } = await supabase
          .from('project_files')
          .update({ is_deleted: true, updated_at: new Date().toISOString() })
          .in('id', Array.from(selectedFiles));

        if (filesError) throw filesError;
      }

      // Delete selected folders and their contents - CRITICAL: Scope by project_id
      const projectId = window.location.pathname.split('/')[2];
      for (const folderPath of selectedFolders) {
        if (folderPath !== 'Root') { // Don't allow deleting Root folder
          const { error: folderError } = await supabase
            .from('project_files')
            .update({ is_deleted: true, updated_at: new Date().toISOString() })
            .eq('project_id', projectId)
            .like('original_filename', `${folderPath}%`);

          if (folderError) throw folderError;
        }
      }

      const totalDeleted = selectedFiles.size + selectedFolders.size;
      toast({
        title: "Success",
        description: `${totalDeleted} item(s) deleted successfully`,
      });
      
      setSelectedFiles(new Set());
      setSelectedFolders(new Set());
      onRefresh();
    } catch (error) {
      console.error('Bulk delete error:', error);
      toast({
        title: "Delete Error",
        description: "Failed to delete selected items",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
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

  const handleSelectFolder = (folderPath: string, checked: boolean) => {
    const newSelected = new Set(selectedFolders);
    if (checked) {
      newSelected.add(folderPath);
    } else {
      newSelected.delete(folderPath);
    }
    setSelectedFolders(newSelected);
  };

  return {
    selectedFiles,
    selectedFolders,
    isDeleting,
    uploadFileToFolder,
    moveFileToFolder,
    handleDownload,
    handleDelete,
    handleFolderDelete,
    handleBulkDelete,
    handleSelectAll,
    handleSelectFile,
    handleSelectFolder,
  };
};
