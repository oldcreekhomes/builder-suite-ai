
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

export function usePhotoGridActions(onRefresh: () => void) {
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletingPhoto, setDeletingPhoto] = useState<string | null>(null);

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

  const handleShare = async (photo: ProjectPhoto) => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Photo',
          url: photo.url,
        });
      } else {
        await navigator.clipboard.writeText(photo.url);
        toast({
          title: "Link Copied",
          description: "Photo link copied to clipboard",
        });
      }
    } catch (error) {
      console.error('Share error:', error);
      toast({
        title: "Share Error",
        description: "Failed to share photo",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (photo: ProjectPhoto) => {
    setDeletingPhoto(photo.id);
    try {
      console.log('Deleting photo:', photo.id);
      
      const { error } = await supabase
        .from('project_photos')
        .delete()
        .eq('id', photo.id);

      if (error) {
        console.error('Delete error:', error);
        throw new Error(`Delete failed: ${error.message}`);
      }

      console.log('Photo deleted successfully');

      toast({
        title: "Success",
        description: "Photo deleted successfully",
      });
      
      onRefresh();
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Delete Error",
        description: error instanceof Error ? error.message : "Failed to delete photo",
        variant: "destructive",
      });
    } finally {
      setDeletingPhoto(null);
    }
  };

  const handleBulkDelete = async (photos: ProjectPhoto[]) => {
    setIsDeleting(true);
    try {
      console.log('Bulk deleting photos:', photos.length);
      
      const photoIds = photos.map(photo => photo.id);
      
      const { error } = await supabase
        .from('project_photos')
        .delete()
        .in('id', photoIds);

      if (error) {
        console.error('Bulk delete error:', error);
        throw new Error(`Bulk delete failed: ${error.message}`);
      }

      console.log('Photos deleted successfully');

      toast({
        title: "Success",
        description: `Successfully deleted ${photos.length} photo(s)`,
      });
      
      onRefresh();
    } catch (error) {
      console.error('Bulk delete error:', error);
      toast({
        title: "Delete Error",
        description: error instanceof Error ? error.message : "Failed to delete photos",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    isDeleting,
    deletingPhoto,
    handleDownload,
    handleShare,
    handleDelete,
    handleBulkDelete
  };
}
