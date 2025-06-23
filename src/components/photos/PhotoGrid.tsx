
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { MoreVertical, Download, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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

  const handleDownload = async (photo: ProjectPhoto) => {
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
      toast({
        title: "Download Error",
        description: "Failed to download photo",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (photo: ProjectPhoto) => {
    setDeletingPhoto(photo.id);
    try {
      console.log('Deleting photo:', photo.id);
      console.log('Current user:', await supabase.auth.getUser());
      
      // Check if the photo exists and user has permission to delete it
      const { data: photoCheck, error: checkError } = await supabase
        .from('project_photos')
        .select('*')
        .eq('id', photo.id)
        .single();
      
      if (checkError) {
        console.error('Error checking photo:', checkError);
        throw new Error(`Cannot access photo: ${checkError.message}`);
      }
      
      console.log('Photo found:', photoCheck);
      
      const { error, data } = await supabase
        .from('project_photos')
        .delete()
        .eq('id', photo.id)
        .select(); // Add select to see what was actually deleted

      if (error) {
        console.error('Delete error:', error);
        throw new Error(`Delete failed: ${error.message}`);
      }

      console.log('Delete result:', data);
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
      console.log('Current user:', await supabase.auth.getUser());
      
      // First check if photos exist and user has permission
      const { data: photosCheck, error: checkError } = await supabase
        .from('project_photos')
        .select('*')
        .in('id', Array.from(selectedPhotos));
      
      if (checkError) {
        console.error('Error checking photos:', checkError);
        throw new Error(`Cannot access photos: ${checkError.message}`);
      }
      
      console.log('Photos found for deletion:', photosCheck);
      
      const { error, data } = await supabase
        .from('project_photos')
        .delete()
        .in('id', Array.from(selectedPhotos))
        .select(); // Add select to see what was actually deleted

      if (error) {
        console.error('Bulk delete error:', error);
        throw new Error(`Bulk delete failed: ${error.message}`);
      }

      console.log('Bulk delete result:', data);
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
        )}
      </div>

      {/* Photo Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {photos.map((photo) => (
          <Card key={photo.id} className="group overflow-hidden hover:shadow-lg transition-shadow">
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
                alt={photo.description || 'Project photo'}
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
              <p className="text-sm font-medium truncate" title={photo.description || ''}>
                {photo.description || 'Untitled'}
              </p>
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
        ))}
      </div>
    </div>
  );
}
