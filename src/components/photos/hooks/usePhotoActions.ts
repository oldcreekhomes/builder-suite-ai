
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ProjectPhoto {
  id: string;
  project_id: string;
  url: string;
  description: string | null;
  uploaded_by: string;
  uploaded_at: string;
  uploaded_by_profile?: { email: string };
}

interface UsePhotoActionsProps {
  photos: ProjectPhoto[];
  currentIndex: number;
  onPhotoDeleted?: () => void;
  onClose: () => void;
  goToPrevious: () => void;
  goToNext: () => void;
}

export function usePhotoActions({
  photos,
  currentIndex,
  onPhotoDeleted,
  onClose,
  goToPrevious,
  goToNext
}: UsePhotoActionsProps) {
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDownload = async (photo: ProjectPhoto) => {
    try {
      const response = await fetch(photo.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = photo.description || `photo-${photo.id}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download Error",
        description: "Failed to download photo",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (photo: ProjectPhoto) => {
    setIsDeleting(true);
    try {
      console.log('PhotoViewer: Deleting photo:', photo.id);
      console.log('PhotoViewer: Current user:', await supabase.auth.getUser());
      
      const { error, data } = await supabase
        .from('project_photos')
        .delete()
        .eq('id', photo.id)
        .select();

      if (error) {
        console.error('PhotoViewer: Delete error:', error);
        throw new Error(`Delete failed: ${error.message}`);
      }

      console.log('PhotoViewer: Delete result:', data);
      console.log('PhotoViewer: Photo deleted successfully');

      toast({
        title: "Success",
        description: "Photo deleted successfully",
      });
      
      if (onPhotoDeleted) {
        onPhotoDeleted();
      }
      
      if (photos.length === 1) {
        onClose();
      } else if (currentIndex === photos.length - 1) {
        goToPrevious();
      } else {
        goToNext();
      }
    } catch (error) {
      console.error('PhotoViewer: Delete error:', error);
      toast({
        title: "Delete Error",
        description: error instanceof Error ? error.message : "Failed to delete photo",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    isDeleting,
    handleDownload,
    handleDelete
  };
}
