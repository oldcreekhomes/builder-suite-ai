import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { MoreVertical, Download, Trash2, Move, Share2, Folder, ChevronRight, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { MovePhotosModal } from "./MovePhotosModal";
import { SharePhotoModal } from "./SharePhotoModal";

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
    
    // If description contains a folder path, show just the filename
    if (photo.description.includes('/')) {
      return photo.description.split('/').pop() || photo.description;
    }
    
    return photo.description;
  };

  const getPhotoFolder = (photo: ProjectPhoto) => {
    if (!photo.description || !photo.description.includes('/')) return null;
    return photo.description.split('/')[0];
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

  const allSelected = photos.length > 0 && selectedPhotos.size === photos.length;
  const someSelected = selectedPhotos.size > 0 && selectedPhotos.size < photos.length;

  return (
    <div className="space-y-4">
      {/* Bulk Actions Header */}
      <div className="flex items-center justify-between bg-white p-4 rounded-lg border">
        <div className="flex items-center space-x-4">
          <Checkbox
            checked={allSelected ? true : someSelected ? "indeterminate" : false}
            onCheckedChange={handleSelectAll}
          />
          <span className="text-sm text-gray-600">
            {selectedPhotos.size > 0 
              ? `${selectedPhotos.size} photo(s) selected`
              : `Select all photos (${photos.length})`
            }
          </span>
        </div>
        {selectedPhotos.size > 0 && (
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleMovePhotos}
            >
              <Move className="h-4 w-4 mr-2" />
              Move to Folder
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={isDeleting}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {isDeleting ? 'Deleting...' : `Delete Selected (${selectedPhotos.size})`}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure you want to delete {selectedPhotos.size} photo(s)?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the selected photos from the project.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleBulkDelete}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>

      {/* Photo Folders and Grid */}
      <div className="space-y-6">
        {sortedFolders.map((folderPath) => {
          const folderPhotos = groupedPhotos[folderPath];
          const isExpanded = expandedFolders.has(folderPath);
          
          return (
            <div key={folderPath} className="space-y-4">
              {/* Folder Header */}
              <div 
                className="flex items-center space-x-2 py-2 px-4 bg-gray-50 hover:bg-gray-100 cursor-pointer rounded-lg border-2 border-dashed border-gray-300"
                onClick={() => toggleFolder(folderPath)}
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
                  ({folderPhotos.length} photo{folderPhotos.length !== 1 ? 's' : ''})
                </span>
              </div>

              {/* Photos Grid (only show if expanded) */}
              {isExpanded && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 ml-6">
                  {folderPhotos.map((photo) => (
                    <ContextMenu key={photo.id}>
                      <ContextMenuTrigger>
                        <Card className="group overflow-hidden hover:shadow-lg transition-shadow">
                          <div className="relative aspect-square">
                            {/* Selection Checkbox */}
                            <div className="absolute top-2 left-2 z-10">
                              <Checkbox
                                checked={selectedPhotos.has(photo.id)}
                                onCheckedChange={(checked) => handlePhotoSelection(photo.id, checked as boolean)}
                                className="bg-white/80 backdrop-blur-sm"
                              />
                            </div>

                            <img
                              src={photo.url}
                              alt={getPhotoDisplayName(photo)}
                              className="w-full h-full object-cover cursor-pointer"
                              onClick={() => onPhotoSelect(photo)}
                            />
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="secondary" size="icon" className="h-8 w-8">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleDownload(photo)}>
                                    <Download className="h-4 w-4 mr-2" />
                                    Download
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleSharePhoto(photo)}>
                                    <Share2 className="h-4 w-4 mr-2" />
                                    Share
                                  </DropdownMenuItem>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <DropdownMenuItem 
                                        onSelect={(e) => e.preventDefault()}
                                        disabled={deletingPhoto === photo.id}
                                        className="text-red-600"
                                      >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        {deletingPhoto === photo.id ? 'Deleting...' : 'Delete'}
                                      </DropdownMenuItem>
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
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                          <div className="p-3">
                            <div className="space-y-1">
                              <p className="text-sm font-medium truncate" title={getPhotoDisplayName(photo)}>
                                {getPhotoDisplayName(photo)}
                              </p>
                              {getPhotoFolder(photo) && (
                                <p className="text-xs text-blue-600 truncate" title={`Folder: ${getPhotoFolder(photo)}`}>
                                  📁 {getPhotoFolder(photo)}
                                </p>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              {formatDistanceToNow(new Date(photo.uploaded_at), { addSuffix: true })}
                            </p>
                            {photo.uploaded_by_profile && (
                              <p className="text-xs text-gray-400 mt-1">
                                by {photo.uploaded_by_profile.email}
                              </p>
                            )}
                          </div>
                        </Card>
                      </ContextMenuTrigger>
                      <ContextMenuContent>
                        <ContextMenuItem onClick={() => handleDownload(photo)}>
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </ContextMenuItem>
                        <ContextMenuItem onClick={() => handleSharePhoto(photo)}>
                          <Share2 className="h-4 w-4 mr-2" />
                          Create Link & Share
                        </ContextMenuItem>
                        <ContextMenuItem 
                          onClick={() => handlePhotoSelection(photo.id, !selectedPhotos.has(photo.id))}
                        >
                          <Checkbox className="h-4 w-4 mr-2" />
                          {selectedPhotos.has(photo.id) ? 'Deselect' : 'Select'}
                        </ContextMenuItem>
                      </ContextMenuContent>
                    </ContextMenu>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Move Photos Modal */}
      <MovePhotosModal
        isOpen={showMoveModal}
        onClose={() => setShowMoveModal(false)}
        selectedPhotoIds={Array.from(selectedPhotos)}
        photos={photos}
        onSuccess={handleMoveSuccess}
      />

      {/* Share Photo Modal */}
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
