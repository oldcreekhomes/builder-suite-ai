
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { FolderOpen, Plus } from "lucide-react";

interface ProjectPhoto {
  id: string;
  project_id: string;
  url: string;
  description: string | null;
  uploaded_by: string;
  uploaded_at: string;
}

interface MovePhotosModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPhotoIds: string[];
  photos: ProjectPhoto[];
  onSuccess: () => void;
}

export function MovePhotosModal({ isOpen, onClose, selectedPhotoIds, photos, onSuccess }: MovePhotosModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [folders, setFolders] = useState<string[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string>("");
  const [newFolderName, setNewFolderName] = useState("");
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [isMoving, setIsMoving] = useState(false);

  const selectedPhotos = photos.filter(photo => selectedPhotoIds.includes(photo.id));
  const projectId = selectedPhotos[0]?.project_id;

  useEffect(() => {
    if (isOpen && projectId) {
      fetchFolders();
    }
  }, [isOpen, projectId]);

  const fetchFolders = async () => {
    try {
      const { data, error } = await supabase
        .from('project_photos')
        .select('description')
        .eq('project_id', projectId)
        .not('description', 'is', null);

      if (error) throw error;

      // Extract unique folder names from photo descriptions
      const folderSet = new Set<string>();
      data?.forEach(photo => {
        if (photo.description && photo.description.includes('/')) {
          const folderName = photo.description.split('/')[0];
          folderSet.add(folderName);
        }
      });

      setFolders(Array.from(folderSet).sort());
    } catch (error) {
      console.error('Error fetching folders:', error);
    }
  };

  const handleMove = async () => {
    if (!selectedFolder && !newFolderName) {
      toast({
        title: "Select Destination",
        description: "Please select a folder or create a new one",
        variant: "destructive",
      });
      return;
    }

    if (selectedPhotos.length === 0) {
      toast({
        title: "No Photos Selected",
        description: "Please select photos to move",
        variant: "destructive",
      });
      return;
    }

    setIsMoving(true);
    const targetFolder = newFolderName.trim() || selectedFolder;

    try {
      console.log('Moving photos to folder:', targetFolder);
      console.log('Selected photos:', selectedPhotos);

      // Process each photo individually to handle errors better
      for (const photo of selectedPhotos) {
        // Generate a proper filename for the photo
        let filename = photo.description;
        
        // If description is null, empty, or already contains a folder path, generate a new filename
        if (!filename) {
          // Try to extract filename from URL
          const urlParts = photo.url.split('/');
          const urlFilename = urlParts[urlParts.length - 1];
          if (urlFilename && urlFilename.includes('.')) {
            filename = urlFilename;
          } else {
            filename = `photo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.jpg`;
          }
        } else if (filename.includes('/')) {
          // If it's already in a folder, just take the filename part
          filename = filename.split('/').pop() || `photo-${Date.now()}.jpg`;
        }

        const newDescription = `${targetFolder}/${filename}`;
        
        console.log(`Updating photo ${photo.id}: "${photo.description}" -> "${newDescription}"`);

        const { error } = await supabase
          .from('project_photos')
          .update({ description: newDescription })
          .eq('id', photo.id);

        if (error) {
          console.error('Error updating photo:', photo.id, error);
          throw new Error(`Failed to move photo: ${error.message}`);
        }
      }

      console.log('Successfully moved all photos');

      toast({
        title: "Success",
        description: `Moved ${selectedPhotos.length} photo(s) to "${targetFolder}"`,
      });

      onSuccess();
      handleClose();
    } catch (error) {
      console.error('Error moving photos:', error);
      toast({
        title: "Move Error",
        description: error instanceof Error ? error.message : "Failed to move photos to folder",
        variant: "destructive",
      });
    } finally {
      setIsMoving(false);
    }
  };

  const handleClose = () => {
    setSelectedFolder("");
    setNewFolderName("");
    setShowNewFolderInput(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Move Photos to Folder</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="text-sm text-gray-600">
            Moving {selectedPhotos.length} photo(s)
          </div>

          {!showNewFolderInput ? (
            <div className="space-y-2">
              <Label>Select Existing Folder</Label>
              <Select value={selectedFolder} onValueChange={setSelectedFolder}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a folder..." />
                </SelectTrigger>
                <SelectContent>
                  {folders.length === 0 ? (
                    <SelectItem value="" disabled>
                      No existing folders
                    </SelectItem>
                  ) : (
                    folders.map((folder) => (
                      <SelectItem key={folder} value={folder}>
                        <div className="flex items-center">
                          <FolderOpen className="h-4 w-4 mr-2" />
                          {folder}
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowNewFolderInput(true)}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create New Folder
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="folderName">New Folder Name</Label>
              <Input
                id="folderName"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Enter folder name..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newFolderName.trim()) {
                    handleMove();
                  }
                }}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowNewFolderInput(false);
                  setNewFolderName("");
                }}
                className="w-full"
              >
                Use Existing Folder Instead
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleMove} 
            disabled={isMoving || (!selectedFolder && !newFolderName.trim())}
          >
            {isMoving ? "Moving..." : "Move Photos"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
