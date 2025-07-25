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
    if (!user) {
      console.error('Upload failed: No user authenticated');
      return false;
    }

    const fileId = crypto.randomUUID();
    const relativePath = folderName === 'Root' ? file.name : `${folderName}/${file.name}`;
    
    console.log(`Starting upload for file: ${file.name} (${file.size} bytes) to folder: ${folderName}`);
    console.log(`Generated fileId: ${fileId}`);
    
    try {
      // Generate timestamp and add random component to ensure absolute uniqueness
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const fileName = `${user.id}/${window.location.pathname.split('/')[2]}/${fileId}_${timestamp}_${randomSuffix}_${relativePath}`;
      
      console.log(`Generated fileName: ${fileName}`);
      
      // Upload to Supabase Storage
      console.log(`Uploading to storage: ${file.name}`);
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('project-files')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false // Prevent overwriting existing files
        });

      if (uploadError) {
        console.error(`Storage upload failed for ${file.name}:`, uploadError);
        throw uploadError;
      }

      console.log(`Storage upload successful for ${file.name}, uploadData:`, uploadData);
      console.log(`Storage path: ${uploadData.path}`);

      // Insert into database
      console.log(`Inserting into database: ${file.name}`);
      const dbInsertData = {
        project_id: window.location.pathname.split('/')[2],
        filename: fileName,
        original_filename: relativePath,
        file_size: file.size,
        file_type: file.name.split('.').pop()?.toLowerCase() || 'unknown',
        mime_type: file.type,
        storage_path: uploadData.path,
        uploaded_by: user.id,
      };
      
      console.log(`Database insert data for ${file.name}:`, dbInsertData);
      
      const { data: dbData, error: dbError } = await supabase
        .from('project_files')
        .insert(dbInsertData);

      if (dbError) {
        console.error(`Database insert failed for ${file.name}:`, dbError);
        // Clean up storage if database insert fails
        await supabase.storage
          .from('project-files')
          .remove([fileName]);
        throw dbError;
      }

      console.log(`Database insert successful for ${file.name}:`, dbData);
      console.log(`Upload completed successfully for: ${file.name}`);
      return true;
    } catch (error) {
      console.error(`Upload error for ${file.name}:`, error);
      console.error(`Error details:`, {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      toast({
        title: "Upload Error",
        description: `Failed to upload ${file.name}: ${error.message || 'Unknown error'}`,
        variant: "destructive",
      });
      return false;
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
    moveFileToFolder,
    handleSelectAll,
    handleSelectFile,
    handleBulkDelete,
  };
}