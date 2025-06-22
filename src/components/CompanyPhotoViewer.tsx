
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { AllPhoto } from "@/hooks/useAllPhotos";

interface CompanyPhotoViewerProps {
  photos: AllPhoto[];
  currentPhoto: AllPhoto | null;
  isOpen: boolean;
  onClose: () => void;
}

export function CompanyPhotoViewer({ photos, currentPhoto, isOpen, onClose }: CompanyPhotoViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (currentPhoto) {
      const index = photos.findIndex(photo => photo.id === currentPhoto.id);
      setCurrentIndex(index >= 0 ? index : 0);
    }
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
      <DialogContent className="max-w-[95vw] w-full h-[95vh] p-0 flex items-center justify-center">
        <DialogTitle className="sr-only">
          {photo.description || 'Company Photo'}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Photo viewer showing {currentIndex + 1} of {photos.length} company photos
        </DialogDescription>
        
        <div className="relative w-full h-full flex flex-col bg-black rounded-lg overflow-hidden">
          {/* Header */}
          <div className="absolute top-0 left-0 right-0 z-10 bg-black/50 backdrop-blur-sm p-4">
            <div className="flex items-center justify-between text-white">
              <div className="flex-1">
                <h3 className="font-medium truncate">
                  {photo.description || 'Untitled'}
                </h3>
                <p className="text-sm text-gray-300">
                  {photo.project_name} • {currentIndex + 1} of {photos.length} • {formatDistanceToNow(new Date(photo.uploaded_at), { addSuffix: true })}
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
            {imageLoading && (
              <div className="text-white">Loading image...</div>
            )}
            {imageError && (
              <div className="text-white">Failed to load image</div>
            )}
            <img
              src={photo.url}
              alt={photo.description || 'Company photo'}
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
