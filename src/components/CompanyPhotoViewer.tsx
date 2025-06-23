
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, ChevronLeft, ChevronRight, Download, Trash2, ZoomIn, ZoomOut, Hand } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { formatDistanceToNow } from "date-fns";
import { AllPhoto } from "@/hooks/useAllPhotos";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface CompanyPhotoViewerProps {
  photos: AllPhoto[];
  currentPhoto: AllPhoto | null;
  isOpen: boolean;
  onClose: () => void;
  onPhotoDeleted?: () => void;
}

export function CompanyPhotoViewer({ photos, currentPhoto, isOpen, onClose, onPhotoDeleted }: CompanyPhotoViewerProps) {
  const { toast } = useToast();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [panEnabled, setPanEnabled] = useState(false);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (currentPhoto) {
      const index = photos.findIndex(photo => photo.id === currentPhoto.id);
      setCurrentIndex(index >= 0 ? index : 0);
    }
    setImageLoading(true);
    setImageError(false);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setPanEnabled(false);
  }, [currentPhoto, photos]);

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1));
    setImageLoading(true);
    setImageError(false);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setPanEnabled(false);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0));
    setImageLoading(true);
    setImageError(false);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setPanEnabled(false);
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

  const handleDownload = async (photo: AllPhoto) => {
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

  const handleDelete = async (photo: AllPhoto) => {
    setIsDeleting(true);
    try {
      console.log('CompanyPhotoViewer: Deleting photo:', photo.id);
      console.log('CompanyPhotoViewer: Current user:', await supabase.auth.getUser());
      
      const { error, data } = await supabase
        .from('project_photos')
        .delete()
        .eq('id', photo.id)
        .select();

      if (error) {
        console.error('CompanyPhotoViewer: Delete error:', error);
        throw new Error(`Delete failed: ${error.message}`);
      }

      console.log('CompanyPhotoViewer: Delete result:', data);
      console.log('CompanyPhotoViewer: Photo deleted successfully');

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
      console.error('CompanyPhotoViewer: Delete error:', error);
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

  const zoomIn = () => {
    setZoom(prev => Math.min(prev + 0.25, 3));
  };

  const zoomOut = () => {
    setZoom(prev => Math.max(prev - 0.25, 0.25));
  };

  const togglePan = () => {
    setPanEnabled(!panEnabled);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!panEnabled) return;
    
    setIsDragging(true);
    setDragStart({
      x: e.clientX - pan.x,
      y: e.clientY - pan.y
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !panEnabled) return;
    
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Reset pan when zoom changes to 1
  useEffect(() => {
    if (zoom === 1) {
      setPan({ x: 0, y: 0 });
      setPanEnabled(false);
    }
  }, [zoom]);

  if (!photos[currentIndex]) return null;

  const photo = photos[currentIndex];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl w-full max-h-[95vh] p-0 flex flex-col border-0">
        <DialogTitle className="sr-only">
          {photo.description || 'Company Photo'}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Photo viewer showing {currentIndex + 1} of {photos.length} company photos
        </DialogDescription>
        
        <div className="relative w-full h-full flex flex-col bg-white rounded-lg overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-white">
            <div className="flex-1">
              <h3 className="font-medium text-black truncate">
                {photo.description || 'Untitled'}
              </h3>
              <p className="text-sm text-gray-500">
                {photo.project_name} • {currentIndex + 1} of {photos.length} • {formatDistanceToNow(new Date(photo.uploaded_at), { addSuffix: true })}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={togglePan}
                className={`${panEnabled ? 'text-blue-600 bg-blue-50' : 'text-gray-600'} hover:text-blue-600 hover:bg-blue-50`}
              >
                <Hand className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={zoomOut}
                disabled={zoom <= 0.25}
                className="text-gray-600 hover:text-black"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm text-gray-600 min-w-[3rem] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={zoomIn}
                disabled={zoom >= 3}
                className="text-gray-600 hover:text-black"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDownload(photo)}
                className="text-gray-600 hover:text-black"
              >
                <Download className="h-4 w-4" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={isDeleting}
                    className="text-gray-600 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure you want to delete this picture?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete the photo from the project.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={() => handleDelete(photo)}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          {/* Photo */}
          <div 
            className="flex-1 flex items-center justify-center p-4 bg-gray-50 overflow-hidden"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{ cursor: panEnabled ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
          >
            {imageLoading && (
              <div className="text-gray-500">Loading image...</div>
            )}
            {imageError && (
              <div className="text-red-500">Failed to load image</div>
            )}
            <img
              src={photo.url}
              alt={photo.description || 'Company photo'}
              className="max-w-full max-h-full object-contain"
              onLoad={handleImageLoad}
              onError={handleImageError}
              style={{ 
                display: imageLoading || imageError ? 'none' : 'block',
                transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                transition: isDragging ? 'none' : 'transform 0.2s ease',
                pointerEvents: panEnabled ? 'none' : 'auto'
              }}
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
