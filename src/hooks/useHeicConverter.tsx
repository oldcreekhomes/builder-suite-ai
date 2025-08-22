import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "@/hooks/use-toast";
import heic2any from "heic2any";
import { ProjectPhoto } from "./useProjectPhotos";

export const useHeicConverter = (photos: ProjectPhoto[], onSuccess: () => void) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isConverting, setIsConverting] = useState(false);
  const [convertedCount, setConvertedCount] = useState(0);

  const convertHeicFile = async (photo: ProjectPhoto): Promise<boolean> => {
    if (!user) return false;

    const isHeicFile = photo.description?.toLowerCase().endsWith('.heic') || 
                      photo.url.toLowerCase().includes('.heic');
    
    if (!isHeicFile) return false;

    try {
      console.log('Converting existing HEIC photo:', photo.description);
      
      // Fetch the HEIC file from storage
      const response = await fetch(photo.url);
      if (!response.ok) throw new Error('Failed to fetch HEIC file');
      
      const heicBlob = await response.blob();
      
      // Convert HEIC to JPEG
      const convertedBlob = await heic2any({
        blob: heicBlob,
        toType: "image/jpeg",
        quality: 0.8
      }) as Blob;

      // Create new filename with .jpg extension
      const originalName = photo.description?.replace(/\.heic$/i, '') || 'photo';
      const newDescription = `${originalName}.jpg`;
      
      // Extract the original path structure from the existing URL
      const urlParts = photo.url.split('/');
      const fileName = urlParts[urlParts.length - 1];
      const fileId = fileName.split('_')[0];
      const newFileName = `${user.id}/${photo.project_id}/photos/${fileId}_${newDescription}`;
      
      // Upload the converted file
      const { error: uploadError } = await supabase.storage
        .from('project-files')
        .upload(newFileName, convertedBlob);

      if (uploadError) throw uploadError;

      // Get new public URL
      const { data: { publicUrl } } = supabase.storage
        .from('project-files')
        .getPublicUrl(newFileName);

      // Update the database record
      const { error: updateError } = await supabase
        .from('project_photos')
        .update({
          url: publicUrl,
          description: newDescription
        })
        .eq('id', photo.id);

      if (updateError) throw updateError;

      // Delete the old HEIC file
      const oldFileName = photo.url.split('/').slice(-4).join('/');
      await supabase.storage
        .from('project-files')
        .remove([oldFileName]);

      console.log('Successfully converted HEIC photo:', newDescription);
      return true;
    } catch (error) {
      console.error('Failed to convert HEIC photo:', photo.description, error);
      return false;
    }
  };

  const convertAllHeicFiles = async () => {
    if (!photos.length || isConverting) return;

    const heicPhotos = photos.filter(photo => 
      photo.description?.toLowerCase().endsWith('.heic') || 
      photo.url.toLowerCase().includes('.heic')
    );

    if (heicPhotos.length === 0) return;

    setIsConverting(true);
    setConvertedCount(0);

    console.log(`Found ${heicPhotos.length} HEIC files to convert`);

    let successCount = 0;
    for (const photo of heicPhotos) {
      const success = await convertHeicFile(photo);
      if (success) {
        successCount++;
        setConvertedCount(successCount);
      }
    }

    setIsConverting(false);

    if (successCount > 0) {
      toast({
        title: "HEIC Conversion Complete",
        description: `Successfully converted ${successCount} HEIC photo${successCount > 1 ? 's' : ''} to JPEG`,
      });
      onSuccess();
    }
  };

  useEffect(() => {
    // Run conversion when photos are loaded and user is available
    if (photos.length > 0 && user) {
      convertAllHeicFiles();
    }
  }, [photos.length, user?.id]);

  return { isConverting, convertedCount };
};