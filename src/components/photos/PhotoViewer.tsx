
import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
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
}

export function PhotoViewer({ photos, currentPhoto, isOpen, onClose }: PhotoViewerProps) {
  const { toast } = useToast();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const index = photos.findIndex(photo => photo.id === currentPhoto.id);
    setCurrentIndex(index >= 0 ? index : 0);
  }, [currentPhoto, photos]);

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0));
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
      const { error } = await supabase
        .from('project_photos')
        .delete()
        .eq('id', photo.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Photo deleted successfully",
      });
      
      // Close viewer if it was the last photo or navigate to next photo
      if (photos.length === 1) {
        onClose();
      } else if (currentIndex === photos.length - 1) {
        goToPrevious();
      } else {
        goToNext();
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Delete Error",
        description: "Failed to delete photo",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (!photos[currentIndex]) return null;

  const photo = photos[currentIndex];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl w-full h-[90vh] p-0">
        <div className="relative w-full h-full flex flex-col bg-black">
          {/* Header */}
          <div className="absolute top-0 left-0 right-0 z-10 bg-black/50 backdrop-blur-sm p-4">
            <div className="flex items-center justify-between text-white">
              <div className="flex-1">
                <h3 className="font-medium truncate">
                  {photo.description || 'Untitled'}
                </h3>
                <p className="text-sm text-gray-300">
                  {currentIndex + 1} of {photos.length} • {formatDistanceToNow(new Date(photo.uploaded_at), { addSuffix: true })}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDownload(photo)}
                  className="text-white hover:bg-white/20"
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(photo)}
                  disabled={isDeleting}
                  className="text-white hover:bg-white/20"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="text-white hover:bg-white/20"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Photo */}
          <div className="flex-1 flex items-center justify-center p-4">
            <img
              src={photo.url}
              alt={photo.description || 'Project photo'}
              className="max-w-full max-h-full object-contain"
            />
          </div>

          {/* Navigation */}
          {photos.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={goToPrevious}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20"
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={goToNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20"
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
