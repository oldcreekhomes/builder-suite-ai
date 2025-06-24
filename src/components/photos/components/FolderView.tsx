
import { Folder, ChevronRight, ChevronDown } from "lucide-react";
import { PhotoCard } from "./PhotoCard";

interface ProjectPhoto {
  id: string;
  project_id: string;
  url: string;
  description: string | null;
  uploaded_by: string;
  uploaded_at: string;
  uploaded_by_profile?: { email: string };
}

interface FolderViewProps {
  folderPath: string;
  photos: ProjectPhoto[];
  isExpanded: boolean;
  selectedPhotos: Set<string>;
  deletingPhoto: string | null;
  onToggleFolder: (folderPath: string) => void;
  onPhotoSelect: (photo: ProjectPhoto) => void;
  onPhotoSelection: (photoId: string, checked: boolean) => void;
  onDownload: (photo: ProjectPhoto) => void;
  onShare: (photo: ProjectPhoto) => void;
  onDelete: (photo: ProjectPhoto) => void;
}

export function FolderView({
  folderPath,
  photos,
  isExpanded,
  selectedPhotos,
  deletingPhoto,
  onToggleFolder,
  onPhotoSelect,
  onPhotoSelection,
  onDownload,
  onShare,
  onDelete
}: FolderViewProps) {
  return (
    <div className="space-y-4">
      <div 
        className="flex items-center space-x-2 py-2 px-4 bg-gray-50 hover:bg-gray-100 cursor-pointer rounded-lg border-2 border-dashed border-gray-300"
        onClick={() => onToggleFolder(folderPath)}
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-gray-500" />
        ) : (
          <ChevronRight className="h-4 w-4 text-gray-500" />
        )}
        <Folder className="h-5 w-5 text-blue-500" />
        <span className="font-semibold text-gray-700">
          {folderPath === 'Root' ? 'Root Photos' : folderPath}
        </span>
        <span className="text-sm text-gray-500">
          ({photos.length} photo{photos.length !== 1 ? 's' : ''})
        </span>
      </div>

      {isExpanded && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 ml-6">
          {photos.map((photo) => (
            <PhotoCard
              key={photo.id}
              photo={photo}
              isSelected={selectedPhotos.has(photo.id)}
              isDeleting={deletingPhoto === photo.id}
              onPhotoSelect={onPhotoSelect}
              onSelectionChange={onPhotoSelection}
              onDownload={onDownload}
              onShare={onShare}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
