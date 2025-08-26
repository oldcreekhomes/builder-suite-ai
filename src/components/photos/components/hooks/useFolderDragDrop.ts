
import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { convertHeicToJpeg, updateHeicPath, ConversionResult } from "@/utils/heicConverter";

interface UseFolderDragDropProps {
  folderPath: string;
  projectId: string;
  onUploadSuccess: () => void;
}

export function useFolderDragDrop({ folderPath, projectId, onUploadSuccess }: UseFolderDragDropProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const uploadPhoto = async (file: File, relativePath: string) => {
    if (!user) return false;

    try {
      // Convert HEIC files to JPEG before upload
      const conversionResult: ConversionResult = await convertHeicToJpeg(file);

      const fileId = crypto.randomUUID();
      // Use processed file name for the path
      const processedRelativePath = relativePath === file.name ? conversionResult.file.name : 
        (conversionResult.wasConverted ? updateHeicPath(relativePath) : relativePath);
      const fileName = `${user.id}/${projectId}/photos/${fileId}_${processedRelativePath}`;
      
      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('project-files')
        .upload(fileName, conversionResult.file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('project-files')
        .getPublicUrl(fileName);

      // Save photo metadata to database
      const { error: dbError } = await supabase
        .from('project_photos')
        .insert({
          project_id: projectId,
          url: publicUrl,
          description: processedRelativePath,
          uploaded_by: user.id,
        });

      if (dbError) throw dbError;

      // Show conversion status toast if converted
      if (conversionResult.wasConverted) {
        toast({
          title: "HEIC Converted",
          description: `Converted ${file.name} to JPEG using ${conversionResult.strategy}`,
        });
      } else if (conversionResult.error) {
        toast({
          title: "HEIC Upload",
          description: conversionResult.error,
          variant: "destructive",
        });
      }

      return true;
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Error",
        description: `Failed to upload ${file.name}`,
        variant: "destructive",
      });
      return false;
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    console.log('Photos dropped into folder:', folderPath, acceptedFiles);
    
    let successCount = 0;
    
    for (const file of acceptedFiles) {
      // Create the path with the folder structure
      const relativePath = folderPath === 'Root' ? file.name : `${folderPath}/${file.name}`;
      
      const success = await uploadPhoto(file, relativePath);
      if (success) {
        successCount++;
      }
    }

    if (successCount > 0) {
      toast({
        title: "Upload Complete",
        description: `Successfully uploaded ${successCount} photo(s) to ${folderPath === 'Root' ? 'Root Photos' : folderPath}`,
      });
      onUploadSuccess();
    }
  }, [folderPath, projectId, user, toast, onUploadSuccess]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    noClick: true,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.svg', '.heic', '.HEIC']
    }
  });

  return { getRootProps, getInputProps, isDragActive };
}
