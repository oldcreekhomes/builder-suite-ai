import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { PhotoViewerHeader } from "./PhotoViewerHeader";
import { PhotoViewerImage } from "./PhotoViewerImage";
import { PhotoViewerNavigation } from "./PhotoViewerNavigation";
import { usePhotoNavigation } from "./hooks/usePhotoNavigation";
import { usePhotoActions } from "./hooks/usePhotoActions";
import { usePhotoZoom } from "./hooks/usePhotoZoom";
import { usePhotoPan } from "./hooks/usePhotoPan";

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
  onPhotoDeleted?: () => void;
}

export function PhotoViewer({ photos, currentPhoto, isOpen, onClose, onPhotoDeleted }: PhotoViewerProps) {
  const { currentIndex, goToPrevious, goToNext } = usePhotoNavigation({
    photos,
    currentPhoto,
    isOpen
  });

  const { isDeleting, handleDownload, handleDelete } = usePhotoActions({
    photos,
    currentIndex,
    onPhotoDeleted,
    onClose,
    goToPrevious,
    goToNext
  });

  const { zoom, zoomIn, zoomOut, resetZoom } = usePhotoZoom();
  const { panEnabled, togglePan, disablePan } = usePhotoPan();

  // Disable pan when zoom is at 100%
  React.useEffect(() => {
    if (zoom === 1) {
      disablePan();
    }
  }, [zoom, disablePan]);

  if (!photos[currentIndex]) return null;

  const photo = photos[currentIndex];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl w-full max-h-[95vh] p-0 flex flex-col border-0">
        <DialogTitle className="sr-only">
          {photo.description || 'Project Photo'}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Photo viewer showing {currentIndex + 1} of {photos.length} photos
        </DialogDescription>
        
        <div className="relative w-full h-full flex flex-col bg-white rounded-lg overflow-hidden">
          <PhotoViewerHeader
            photo={photo}
            currentIndex={currentIndex}
            totalPhotos={photos.length}
            isDeleting={isDeleting}
            zoom={zoom}
            panEnabled={panEnabled}
            onZoomIn={zoomIn}
            onZoomOut={zoomOut}
            onPanToggle={togglePan}
            onDownload={handleDownload}
            onDelete={handleDelete}
            onClose={onClose}
          />

          <PhotoViewerImage 
            photo={photo} 
            zoom={zoom} 
            panEnabled={panEnabled}
            onPanToggle={togglePan}
          />

          <PhotoViewerNavigation
            totalPhotos={photos.length}
            onPrevious={goToPrevious}
            onNext={goToNext}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
