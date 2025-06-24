import { useState } from "react";
import { FolderView } from "./components/FolderView";
import { BulkActionBar } from "./components/BulkActionBar";
import { MovePhotosModal } from "./MovePhotosModal";
import { PhotoShareModal } from "./components/PhotoShareModal";
import { FolderShareModal } from "./components/FolderShareModal";
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
  const [showPhotoShareModal, setShowPhotoShareModal] = useState(false);
  const [showFolderShareModal, setShowFolderShareModal] = useState(false);
  const [sharePhoto, setSharePhoto] = useState<ProjectPhoto | null>(null);
  const [shareFolder, setShareFolder] = useState<{ folderPath: string; photos: ProjectPhoto[] } | null>(null);

  const { handleDownload, handleShare, handleDelete, handleBulkDelete, deletingPhoto, isDeleting } = usePhotoGridActions(onRefresh);

  // Filter out placeholder files from photos
  const visiblePhotos = photos.filter(photo => 
    !photo.description?.endsWith('.placeholder')
  );

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

  const folderGroups = groupPhotos(visiblePhotos);

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
      const allPhotoIds = new Set(visiblePhotos.map(photo => photo.id));
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
    const selectedPhotoObjects = visiblePhotos.filter(photo => selectedPhotos.has(photo.id));
    await handleBulkDelete(selectedPhotoObjects);
    setSelectedPhotos(new Set());
  };

  const handlePhotoShare = (photo: ProjectPhoto) => {
    setSharePhoto(photo);
    setShowPhotoShareModal(true);
  };

  const handleFolderShare = (folderPath: string, photos: ProjectPhoto[]) => {
    setShareFolder({ folderPath, photos });
    setShowFolderShareModal(true);
  };

  if (visiblePhotos.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">No photos uploaded yet</p>
        <p className="text-gray-400 text-sm mt-2">Upload some photos to get started</p>
      </div>
    );
  }

  // Extract project ID from the first photo
  const projectId = visiblePhotos[0]?.project_id || '';

  return (
    <div className="space-y-6">
      <BulkActionBar
        photos={visiblePhotos}
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
              onShare={handlePhotoShare}
              onDelete={handleDelete}
              onUploadSuccess={onRefresh}
              onShareFolder={handleFolderShare}
              projectId={projectId}
            />
          ))}
      </div>

      {showMoveModal && (
        <MovePhotosModal
          isOpen={showMoveModal}
          onClose={() => setShowMoveModal(false)}
          selectedPhotoIds={Array.from(selectedPhotos)}
          photos={visiblePhotos}
          onSuccess={() => {
            setSelectedPhotos(new Set());
            onRefresh();
          }}
        />
      )}

      {showPhotoShareModal && (
        <PhotoShareModal
          isOpen={showPhotoShareModal}
          onClose={() => {
            setShowPhotoShareModal(false);
            setSharePhoto(null);
          }}
          photo={sharePhoto}
        />
      )}

      {showFolderShareModal && shareFolder && (
        <FolderShareModal
          isOpen={showFolderShareModal}
          onClose={() => {
            setShowFolderShareModal(false);
            setShareFolder(null);
          }}
          folderPath={shareFolder.folderPath}
          photos={shareFolder.photos}
          projectId={projectId}
        />
      )}
    </div>
  );
}
