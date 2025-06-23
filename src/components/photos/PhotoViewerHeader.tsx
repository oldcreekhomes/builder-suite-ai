
import { Button } from "@/components/ui/button";
import { X, Download, Trash2 } from "lucide-react";
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
  onDownload: (photo: ProjectPhoto) => void;
  onDelete: (photo: ProjectPhoto) => void;
  onClose: () => void;
}

export function PhotoViewerHeader({
  photo,
  currentIndex,
  totalPhotos,
  isDeleting,
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
  );
}
