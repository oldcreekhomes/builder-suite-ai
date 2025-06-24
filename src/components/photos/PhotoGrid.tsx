
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { MovePhotosModal } from "./MovePhotosModal";
import { SharePhotoModal } from "./SharePhotoModal";
import { BulkActionBar } from "./components/BulkActionBar";
import { FolderView } from "./components/FolderView";

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
  const [deletingPhoto, setDeletingPhoto] = useState<string | null>(null);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [photoToShare, setPhotoToShare] = useState<ProjectPhoto | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  // Group photos by folder
  const groupPhotosByFolder = (photos: ProjectPhoto[]) => {
    const grouped: Record<string, ProjectPhoto[]> = {};
    
    photos.forEach(photo => {
      if (!photo.description || !photo.description.includes('/')) {
        // Root level photos
        if (!grouped['Root']) grouped['Root'] = [];
        grouped['Root'].push(photo);
      } else {
        // Photos in folders
        const folderName = photo.description.split('/')[0];
        if (!grouped[folderName]) grouped[folderName] = [];
        grouped[folderName].push(photo);
      }
    });
    
    return grouped;
  };

  const toggleFolder = (folderPath: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderPath)) {
      newExpanded.delete(folderPath);
    } else {
      newExpanded.add(folderPath);
    }
    setExpandedFolders(newExpanded);
  };

  const handleDownload = async (photo: ProjectPhoto) => {
    try {
      const response = await fetch(photo.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = getPhotoDisplayName(photo);
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

  const getPhotoDisplayName = (photo: ProjectPhoto) => {
    if (!photo.description) return `photo-${photo.id}`;
    
    if (photo.description.includes('/')) {
      return photo.description.split('/').pop() || photo.description;
    }
    
    return photo.description;
  };

  const handleDelete = async (photo: ProjectPhoto) => {
    setDeletingPhoto(photo.id);
    try {
      console.log('Deleting photo:', photo.id);
      
      const { error } = await supabase
        .from('project_photos')
        .delete()
        .eq('id', photo.id);

      if (error) {
        console.error('Delete error:', error);
        throw new Error(`Delete failed: ${error.message}`);
      }

      console.log('Photo deleted successfully');
      
      toast({
        title: "Success",
        description: "Photo deleted successfully",
      });
      onRefresh();
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Delete Error",
        description: error instanceof Error ? error.message : "Failed to delete photo",
        variant: "destructive",
      });
    } finally {
      setDeletingPhoto(null);
    }
  };

  const handlePhotoSelection = (photoId: string, checked: boolean) => {
    const newSelection = new Set(selectedPhotos);
    if (checked) {
      newSelection.add(photoId);
    } else {
      newSelection.delete(photoId);
    }
    setSelectedPhotos(newSelection);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedPhotos(new Set(photos.map(photo => photo.id)));
    } else {
      setSelectedPhotos(new Set());
    }
  };

  const handleBulkDelete = async () => {
    if (selectedPhotos.size === 0) return;

    setIsDeleting(true);
    try {
      console.log('Bulk deleting photos:', Array.from(selectedPhotos));
      
      const { error } = await supabase
        .from('project_photos')
        .delete()
        .in('id', Array.from(selectedPhotos));

      if (error) {
        console.error('Bulk delete error:', error);
        throw new Error(`Bulk delete failed: ${error.message}`);
      }

      console.log('Bulk delete successful');
      
      toast({
        title: "Success",
        description: `${selectedPhotos.size} photo(s) deleted successfully`,
      });
      setSelectedPhotos(new Set());
      onRefresh();
    } catch (error) {
      console.error('Bulk delete error:', error);
      toast({
        title: "Delete Error",
        description: error instanceof Error ? error.message : "Failed to delete selected photos",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleMovePhotos = () => {
    if (selectedPhotos.size === 0) {
      toast({
        title: "No Photos Selected",
        description: "Please select photos to move",
        variant: "destructive",
      });
      return;
    }
    setShowMoveModal(true);
  };

  const handleSharePhoto = (photo: ProjectPhoto) => {
    setPhotoToShare(photo);
    setShowShareModal(true);
  };

  const handleMoveSuccess = () => {
    setSelectedPhotos(new Set());
    setShowMoveModal(false);
    onRefresh();
  };

  if (photos.length === 0) {
    return (
      <Card className="p-12 text-center">
        <div className="text-gray-500">
          <p className="text-lg font-medium mb-2">No photos yet</p>
          <p>Upload some photos to get started</p>
        </div>
      </Card>
    );
  }

  const groupedPhotos = groupPhotosByFolder(photos);
  const sortedFolders = Object.keys(groupedPhotos).sort((a, b) => {
    if (a === 'Root') return -1;
    if (b === 'Root') return 1;
    return a.localeCompare(b);
  });

  return (
    <div className="space-y-4">
      <BulkActionBar
        photos={photos}
        selectedPhotos={selectedPhotos}
        isDeleting={isDeleting}
        onSelectAll={handleSelectAll}
        onMovePhotos={handleMovePhotos}
        onBulkDelete={handleBulkDelete}
      />

      <div className="space-y-6">
        {sortedFolders.map((folderPath) => (
          <FolderView
            key={folderPath}
            folderPath={folderPath}
            photos={groupedPhotos[folderPath]}
            isExpanded={expandedFolders.has(folderPath)}
            selectedPhotos={selectedPhotos}
            deletingPhoto={deletingPhoto}
            onToggleFolder={toggleFolder}
            onPhotoSelect={onPhotoSelect}
            onPhotoSelection={handlePhotoSelection}
            onDownload={handleDownload}
            onShare={handleSharePhoto}
            onDelete={handleDelete}
          />
        ))}
      </div>

      <MovePhotosModal
        isOpen={showMoveModal}
        onClose={() => setShowMoveModal(false)}
        selectedPhotoIds={Array.from(selectedPhotos)}
        photos={photos}
        onSuccess={handleMoveSuccess}
      />

      <SharePhotoModal
        isOpen={showShareModal}
        onClose={() => {
          setShowShareModal(false);
          setPhotoToShare(null);
        }}
        photo={photoToShare}
      />
    </div>
  );
}
