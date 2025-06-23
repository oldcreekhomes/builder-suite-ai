
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, ChevronLeft, ChevronRight, Download, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface ProjectPhoto {
  id: string;
  project_id: string;
  url: string;
  description: string | null;
  uploaded_by: string;
  uploaded_at: string;
  uploaded_by_profile?: { email: string };
}

interface PhotoViewerProps {
  photos: ProjectPhoto[];
  currentPhoto: ProjectPhoto;
  isOpen: boolean;
  onClose: () => void;
  onPhotoDeleted?: () => void; // Add callback for when photo is deleted
}

export function PhotoViewer({ photos, currentPhoto, isOpen, onClose, onPhotoDeleted }: PhotoViewerProps) {
  const { toast } = useToast();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    const index = photos.findIndex(photo => photo.id === currentPhoto.id);
    setCurrentIndex(index >= 0 ? index : 0);
    setImageLoading(true);
    setImageError(false);
  }, [currentPhoto, photos]);

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1));
    setImageLoading(true);
    setImageError(false);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0));
    setImageLoading(true);
    setImageError(false);
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'ArrowLeft') goToPrevious();
    if (event.key === 'ArrowRight') goToNext();
    if (event.key === 'Escape') onClose();
  };

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen]);

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
      
      // Notify parent component to refresh the photo list
      if (onPhotoDeleted) {
        onPhotoDeleted();
      }
      
      // Close viewer if it was the last photo or navigate to next photo
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

  const handleImageLoad = () => {
    setImageLoading(false);
    setImageError(false);
  };

  const handleImageError = () => {
    setImageLoading(false);
    setImageError(true);
    console.error('Image failed to load:', photos[currentIndex]?.url);
  };

  if (!photos[currentIndex]) return null;

  const photo = photos[currentIndex];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full max-h-[90vh] p-0 flex flex-col">
        <DialogTitle className="sr-only">
          {photo.description || 'Project Photo'}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Photo viewer showing {currentIndex + 1} of {photos.length} photos
        </DialogDescription>
        
        <div className="relative w-full h-full flex flex-col bg-white rounded-lg overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-white">
            <div className="flex-1">
              <h3 className="font-medium text-black truncate">
                {photo.description || 'Untitled'}
              </h3>
              <p className="text-sm text-gray-500">
                {currentIndex + 1} of {photos.length} • {formatDistanceToNow(new Date(photo.uploaded_at), { addSuffix: true })}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDownload(photo)}
                className="text-gray-600 hover:text-black"
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(photo)}
                disabled={isDeleting}
                className="text-gray-600 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-gray-600 hover:text-black"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Photo Container */}
          <div className="flex-1 flex items-center justify-center p-4 bg-gray-50 overflow-auto">
            {imageLoading && (
              <div className="text-gray-500">Loading image...</div>
            )}
            {imageError && (
              <div className="text-red-500">Failed to load image</div>
            )}
            <img
              src={photo.url}
              alt={photo.description || 'Project photo'}
              className="max-w-full max-h-full object-contain"
              onLoad={handleImageLoad}
              onError={handleImageError}
              style={{ display: imageLoading || imageError ? 'none' : 'block' }}
            />
          </div>

          {/* Navigation */}
          {photos.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={goToPrevious}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-600 hover:text-black shadow-md"
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={goToNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-600 hover:text-black shadow-md"
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
