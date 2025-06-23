
import { Button } from "@/components/ui/button";
import { Download, Trash2, ZoomIn, ZoomOut, Hand } from "lucide-react";
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

interface PhotoViewerHeaderProps {
  photo: ProjectPhoto;
  currentIndex: number;
  totalPhotos: number;
  isDeleting: boolean;
  zoom: number;
  panEnabled: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onPanToggle: () => void;
  onDownload: (photo: ProjectPhoto) => void;
  onDelete: (photo: ProjectPhoto) => void;
  onClose: () => void;
}

export function PhotoViewerHeader({
  photo,
  currentIndex,
  totalPhotos,
  isDeleting,
  zoom,
  panEnabled,
  onZoomIn,
  onZoomOut,
  onPanToggle,
  onDownload,
  onDelete,
  onClose
}: PhotoViewerHeaderProps) {
  return (
    <div className="flex items-center justify-between p-4 border-b bg-white">
      <div className="flex-1">
        <h3 className="font-medium text-black truncate">
          {photo.description || 'Untitled'}
        </h3>
        <p className="text-sm text-gray-500">
          {currentIndex + 1} of {totalPhotos} • {formatDistanceToNow(new Date(photo.uploaded_at), { addSuffix: true })}
        </p>
      </div>
      <div className="flex items-center space-x-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onPanToggle}
          className={`${panEnabled ? 'text-blue-600 bg-blue-50' : 'text-gray-600'} hover:text-blue-600 hover:bg-blue-50`}
        >
          <Hand className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onZoomOut}
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
          onClick={onZoomIn}
          disabled={zoom >= 3}
          className="text-gray-600 hover:text-black"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDownload(photo)}
          className="text-gray-600 hover:text-black"
        >
          <Download className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDelete(photo)}
          disabled={isDeleting}
          className="text-gray-600 hover:text-red-600"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
