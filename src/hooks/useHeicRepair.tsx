import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { convertHeicToJpeg, updateHeicPath } from "@/utils/heicConverter";

interface ProjectPhoto {
  id: string;
  project_id: string;
  url: string;
  description: string | null;
  uploaded_by: string;
  uploaded_at: string;
}

export const useHeicRepair = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isRepairing, setIsRepairing] = useState(false);
  const [repairProgress, setRepairProgress] = useState(0);
  const [repairedCount, setRepairedCount] = useState(0);

  const repairHeicFile = async (photo: ProjectPhoto): Promise<boolean> => {
    if (!user) return false;

    try {
      console.log('🔧 Repairing HEIC file:', photo.description);

      // Download the original HEIC file
      const response = await fetch(photo.url);
      if (!response.ok) throw new Error('Failed to fetch HEIC file');
      
      const blob = await response.blob();
      const file = new File([blob], photo.description || 'heic-file.heic', { 
        type: 'image/heic' 
      });

      // Convert to JPEG
      const conversionResult = await convertHeicToJpeg(file, 0.9);
      
      if (!conversionResult.wasConverted) {
        console.error('❌ Failed to convert HEIC file:', photo.description);
        return false;
      }

      // Extract path components
      const urlParts = photo.url.split('/');
      const storageFileName = urlParts[urlParts.length - 1];
      const pathParts = storageFileName.split('_');
      const fileId = pathParts[0];
      
      // Create new JPEG path
      const newDescription = photo.description ? updateHeicPath(photo.description) : 'converted.jpg';
      const newFileName = `${user.id}/${photo.project_id}/photos/${fileId}_${newDescription}`;

      // Upload converted JPEG
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('project-files')
        .upload(newFileName, conversionResult.file);

      if (uploadError) throw uploadError;

      // Get new public URL
      const { data: { publicUrl } } = supabase.storage
        .from('project-files')
        .getPublicUrl(newFileName);

      // Update database record with new URL and description
      const { error: updateError } = await supabase
        .from('project_photos')
        .update({
          url: publicUrl,
          description: newDescription,
          updated_at: new Date().toISOString()
        })
        .eq('id', photo.id);

      if (updateError) throw updateError;

      // Delete original HEIC file from storage
      const originalPath = photo.url.split('/project-files/')[1];
      if (originalPath) {
        await supabase.storage
          .from('project-files')
          .remove([originalPath]);
      }

      console.log('✅ Successfully repaired HEIC file:', newDescription);
      return true;
    } catch (error) {
      console.error('❌ Failed to repair HEIC file:', photo.description, error);
      return false;
    }
  };

  const repairAllHeicFiles = useCallback(async (projectId?: string) => {
    if (!user) return;

    setIsRepairing(true);
    setRepairProgress(0);
    setRepairedCount(0);

    try {
      // Find all HEIC photos
      let query = supabase
        .from('project_photos')
        .select('*')
        .ilike('description', '%.heic');
      
      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data: heicPhotos, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      if (!heicPhotos || heicPhotos.length === 0) {
        toast({
          title: "No HEIC Files Found",
          description: "No HEIC files need repair",
        });
        return;
      }

      console.log(`🔧 Found ${heicPhotos.length} HEIC files to repair`);

      let successCount = 0;
      for (let i = 0; i < heicPhotos.length; i++) {
        const photo = heicPhotos[i];
        const success = await repairHeicFile(photo);
        
        if (success) {
          successCount++;
          setRepairedCount(successCount);
        }
        
        setRepairProgress(((i + 1) / heicPhotos.length) * 100);
      }

      toast({
        title: "HEIC Repair Complete",
        description: `Successfully repaired ${successCount} of ${heicPhotos.length} HEIC files`,
      });

    } catch (error) {
      console.error('HEIC repair error:', error);
      toast({
        title: "Repair Error",
        description: "Failed to complete HEIC repair process",
        variant: "destructive",
      });
    } finally {
      setIsRepairing(false);
    }
  }, [user, toast]);

  return {
    isRepairing,
    repairProgress,
    repairedCount,
    repairAllHeicFiles,
    repairHeicFile,
  };
};