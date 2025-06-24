import { useState } from "react";
import { FolderView } from "./components/FolderView";
import { BulkActionBar } from "./components/BulkActionBar";
import { MovePhotosModal } from "./MovePhotosModal";
import { PhotoShareModal } from "./components/PhotoShareModal";
import { FolderShareModal } from "./components/FolderShareModal";
import { usePhotoGridActions } from "./hooks/usePhotoGridActions";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [selectedFolders, setSelectedFolders] = useState<Set<string>>(new Set());
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['Root']));
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showPhotoShareModal, setShowPhotoShareModal] = useState(false);
  const [showFolderShareModal, setShowFolderShareModal] = useState(false);
  const [sharePhoto, setSharePhoto] = useState<ProjectPhoto | null>(null);
  const [shareFolder, setShareFolder] = useState<{ folderPath: string; photos: ProjectPhoto[] } | null>(null);
  const [isDeletingFolders, setIsDeletingFolders] = useState(false);

  const { handleDownload, handleShare, handleDelete, handleBulkDelete, deletingPhoto, isDeleting } = usePhotoGridActions(onRefresh);

  // Group photos by folder, including placeholder files to show empty folders
  const groupPhotos = (photos: ProjectPhoto[]) => {
    const folders: { [key: string]: ProjectPhoto[] } = {};
    
    photos.forEach(photo => {
      if (!photo.description) {
        // Photos without description go to Root
        if (!folders['Root']) folders['Root'] = [];
        if (!photo.description?.endsWith('.placeholder')) {
          folders['Root'].push(photo);
        }
      } else if (photo.description.includes('/')) {
        // Photos with folder structure
        const folderPath = photo.description.split('/')[0];
        if (!folders[folderPath]) folders[folderPath] = [];
        
        // Only add non-placeholder files to the folder's photo list
        if (!photo.description.endsWith('.placeholder')) {
          folders[folderPath].push(photo);
        }
      } else {
        // Photos with description but no folder go to Root
        if (!folders['Root']) folders['Root'] = [];
        if (!photo.description?.endsWith('.placeholder')) {
          folders['Root'].push(photo);
        }
      }
    });
    
    return folders;
  };

  const folderGroups = groupPhotos(photos);
  
  // Filter out placeholder files for display and selection
  const visiblePhotos = photos.filter(photo => 
    !photo.description?.endsWith('.placeholder')
  );

  const handlePhotoSelection = (photoId: string, checked: boolean) => {
    const newSelected = new Set(selectedPhotos);
    if (checked) {
      newSelected.add(photoId);
    } else {
      newSelected.delete(photoId);
    }
    setSelectedPhotos(newSelected);
  };

  const handleFolderSelection = (folderPath: string, checked: boolean) => {
    const newSelected = new Set(selectedFolders);
    if (checked) {
      newSelected.add(folderPath);
    } else {
      newSelected.delete(folderPath);
    }
    setSelectedFolders(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allPhotoIds = new Set(visiblePhotos.map(photo => photo.id));
      const allFolderPaths = new Set(Object.keys(folderGroups).filter(path => path !== 'Root'));
      setSelectedPhotos(allPhotoIds);
      setSelectedFolders(allFolderPaths);
    } else {
      setSelectedPhotos(new Set());
      setSelectedFolders(new Set());
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
    setIsDeletingFolders(true);
    try {
      // Delete selected photos
      if (selectedPhotos.size > 0) {
        const selectedPhotoObjects = visiblePhotos.filter(photo => selectedPhotos.has(photo.id));
        await handleBulkDelete(selectedPhotoObjects);
      }

      // Delete selected folders (including all photos in them)
      if (selectedFolders.size > 0) {
        for (const folderPath of selectedFolders) {
          // Get all photos in this folder (including placeholder)
          const folderPhotos = photos.filter(photo => 
            photo.description?.startsWith(folderPath + '/') || 
            photo.description === `${folderPath}/.placeholder`
          );
          
          if (folderPhotos.length > 0) {
            const folderPhotoIds = folderPhotos.map(photo => photo.id);
            
            const { error } = await supabase
              .from('project_photos')
              .delete()
              .in('id', folderPhotoIds);

            if (error) {
              throw new Error(`Failed to delete folder ${folderPath}: ${error.message}`);
            }
          }
        }

        toast({
          title: "Success",
          description: `Successfully deleted ${selectedFolders.size} folder(s)`,
        });
      }

      setSelectedPhotos(new Set());
      setSelectedFolders(new Set());
      onRefresh();
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Delete Error",
        description: error instanceof Error ? error.message : "Failed to delete selected items",
        variant: "destructive",
      });
    } finally {
      setIsDeletingFolders(false);
    }
  };

  const handlePhotoShare = (photo: ProjectPhoto) => {
    setSharePhoto(photo);
    setShowPhotoShareModal(true);
  };

  const handleFolderShare = (folderPath: string, photos: ProjectPhoto[]) => {
    setShareFolder({ folderPath, photos });
    setShowFolderShareModal(true);
  };

  if (Object.keys(folderGroups).length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">No photos uploaded yet</p>
        <p className="text-gray-400 text-sm mt-2">Upload some photos to get started</p>
      </div>
    );
  }

  // Extract project ID from the first photo
  const projectId = photos[0]?.project_id || '';

  const totalSelected = selectedPhotos.size + selectedFolders.size;
  const totalItems = visiblePhotos.length + Object.keys(folderGroups).filter(path => path !== 'Root').length;

  return (
    <div className="space-y-6">
      <BulkActionBar
        photos={visiblePhotos}
        selectedPhotos={new Set([...selectedPhotos, ...Array.from(selectedFolders)])}
        isDeleting={isDeleting || isDeletingFolders}
        onSelectAll={handleSelectAll}
        onMovePhotos={handleMovePhotos}
        onBulkDelete={handleBulkDeleteSelected}
        totalSelected={totalSelected}
        totalItems={totalItems}
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
              isSelected={selectedFolders.has(folderPath)}
              selectedPhotos={selectedPhotos}
              deletingPhoto={deletingPhoto}
              onToggleFolder={handleToggleFolder}
              onFolderSelection={folderPath !== 'Root' ? handleFolderSelection : undefined}
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
