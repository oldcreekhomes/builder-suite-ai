import { useState } from "react";
import { FolderView } from "./components/FolderView";
import { BulkActionBar } from "./components/BulkActionBar";
import { MovePhotosModal } from "./MovePhotosModal";
import { usePhotoGridActions } from "./hooks/usePhotoGridActions";

interface ProjectPhoto {
  id: string;
  project_id: string;
  url: string;
  description: string | null;
  uploaded_by: string;
  uploaded_at: string;
  uploaded_by_profile?: { email: string };
}

interface PhotoGridProps {
  photos: ProjectPhoto[];
  onPhotoSelect: (photo: ProjectPhoto) => void;
  onRefresh: () => void;
}

export function PhotoGrid({ photos, onPhotoSelect, onRefresh }: PhotoGridProps) {
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['Root']));
  const [showMoveModal, setShowMoveModal] = useState(false);

  const { handleDownload, handleShare, handleDelete, handleBulkDelete, deletingPhoto, isDeleting } = usePhotoGridActions(onRefresh);

  // Group photos by folder
  const groupPhotos = (photos: ProjectPhoto[]) => {
    const folders: { [key: string]: ProjectPhoto[] } = {};
    
    photos.forEach(photo => {
      if (!photo.description) {
        // Photos without description go to Root
        if (!folders['Root']) folders['Root'] = [];
        folders['Root'].push(photo);
      } else if (photo.description.includes('/')) {
        // Photos with folder structure
        const folderPath = photo.description.split('/')[0];
        if (!folders[folderPath]) folders[folderPath] = [];
        folders[folderPath].push(photo);
      } else {
        // Photos with description but no folder go to Root
        if (!folders['Root']) folders['Root'] = [];
        folders['Root'].push(photo);
      }
    });
    
    return folders;
  };

  const folderGroups = groupPhotos(photos);

  const handlePhotoSelection = (photoId: string, checked: boolean) => {
    const newSelected = new Set(selectedPhotos);
    if (checked) {
      newSelected.add(photoId);
    } else {
      newSelected.delete(photoId);
    }
    setSelectedPhotos(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allPhotoIds = new Set(photos.map(photo => photo.id));
      setSelectedPhotos(allPhotoIds);
    } else {
      setSelectedPhotos(new Set());
    }
  };

  const handleToggleFolder = (folderPath: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderPath)) {
      newExpanded.delete(folderPath);
    } else {
      newExpanded.add(folderPath);
    }
    setExpandedFolders(newExpanded);
  };

  const handleMovePhotos = () => {
    setShowMoveModal(true);
  };

  const handleBulkDeleteSelected = async () => {
    const selectedPhotoObjects = photos.filter(photo => selectedPhotos.has(photo.id));
    await handleBulkDelete(selectedPhotoObjects);
    setSelectedPhotos(new Set());
  };

  if (photos.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">No photos uploaded yet</p>
        <p className="text-gray-400 text-sm mt-2">Upload some photos to get started</p>
      </div>
    );
  }

  // Extract project ID from the first photo
  const projectId = photos[0]?.project_id || '';

  return (
    <div className="space-y-6">
      <BulkActionBar
        photos={photos}
        selectedPhotos={selectedPhotos}
        isDeleting={isDeleting}
        onSelectAll={handleSelectAll}
        onMovePhotos={handleMovePhotos}
        onBulkDelete={handleBulkDeleteSelected}
      />

      <div className="space-y-4">
        {Object.entries(folderGroups)
          .sort(([a], [b]) => {
            if (a === 'Root') return -1;
            if (b === 'Root') return 1;
            return a.localeCompare(b);
          })
          .map(([folderPath, folderPhotos]) => (
            <FolderView
              key={folderPath}
              folderPath={folderPath}
              photos={folderPhotos}
              isExpanded={expandedFolders.has(folderPath)}
              selectedPhotos={selectedPhotos}
              deletingPhoto={deletingPhoto}
              onToggleFolder={handleToggleFolder}
              onPhotoSelect={onPhotoSelect}
              onPhotoSelection={handlePhotoSelection}
              onDownload={handleDownload}
              onShare={handleShare}
              onDelete={handleDelete}
              onUploadSuccess={onRefresh}
              projectId={projectId}
            />
          ))}
      </div>

      {showMoveModal && (
        <MovePhotosModal
          isOpen={showMoveModal}
          onClose={() => setShowMoveModal(false)}
          selectedPhotoIds={Array.from(selectedPhotos)}
          photos={photos}
          onSuccess={() => {
            setSelectedPhotos(new Set());
            onRefresh();
          }}
        />
      )}
    </div>
  );
}
