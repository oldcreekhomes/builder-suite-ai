import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { FolderOpen, Plus } from "lucide-react";

interface SimpleFile {
  id: string;
  displayName: string;
  file_size: number;
  mime_type: string;
  storage_path: string;
  uploaded_at: string;
  original_filename?: string;
  uploader?: {
    first_name?: string;
    last_name?: string;
    email: string;
  };
}

interface MoveFilesModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedFileIds: string[];
  files: SimpleFile[];
  onSuccess: () => void;
  projectId: string;
}

export function MoveFilesModal({ 
  isOpen, 
  onClose, 
  selectedFileIds, 
  files, 
  onSuccess, 
  projectId 
}: MoveFilesModalProps) {
  const { toast } = useToast();
  const [folders, setFolders] = useState<string[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string>("");
  const [newFolderName, setNewFolderName] = useState("");
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [isMoving, setIsMoving] = useState(false);

  const selectedFiles = files.filter(file => selectedFileIds.includes(file.id));

  useEffect(() => {
    if (isOpen && projectId) {
      fetchFolders();
    }
  }, [isOpen, projectId]);

  const fetchFolders = async () => {
    try {
      const { data, error } = await supabase
        .from('project_files')
        .select('original_filename')
        .eq('project_id', projectId)
        .eq('is_deleted', false)
        .not('original_filename', 'is', null);

      if (error) throw error;

      // Extract unique folder names from file paths
      const folderSet = new Set<string>();
      data?.forEach(file => {
        if (file.original_filename && file.original_filename.includes('/')) {
          const parts = file.original_filename.split('/');
          // Get all possible folder paths (for nested folders)
          let currentPath = '';
          for (let i = 0; i < parts.length - 1; i++) {
            currentPath = currentPath ? `${currentPath}/${parts[i]}` : parts[i];
            folderSet.add(currentPath);
          }
        }
      });

      const folderList = Array.from(folderSet).sort();
      setFolders(folderList);
    } catch (error) {
      console.error('Error fetching folders:', error);
      toast({
        title: "Error",
        description: "Failed to load existing folders",
        variant: "destructive",
      });
    }
  };

  const handleMove = async () => {
    const targetFolder = newFolderName.trim() || selectedFolder;
    
    if (!targetFolder) {
      toast({
        title: "Select Destination",
        description: "Please select a folder or create a new one",
        variant: "destructive",
      });
      return;
    }

    if (selectedFiles.length === 0) {
      toast({
        title: "No Files Selected",
        description: "Please select files to move",
        variant: "destructive",
      });
      return;
    }

    setIsMoving(true);

    try {
      console.log(`Starting to move ${selectedFiles.length} files to "${targetFolder}"`);
      
      // Get existing files in target folder to check for conflicts
      const { data: existingFiles } = await supabase
        .from('project_files')
        .select('original_filename')
        .eq('project_id', projectId)
        .eq('is_deleted', false)
        .ilike('original_filename', `${targetFolder}/%`);

      const existingFilenames = new Set(
        existingFiles?.map(f => f.original_filename?.split('/').pop()) || []
      );

      let successCount = 0;
      let failureCount = 0;
      const failures: string[] = [];

      // Process files sequentially to avoid race conditions
      for (const file of selectedFiles) {
        try {
          console.log(`Processing file: ${file.displayName} (ID: ${file.id})`);
          
          // Get just the filename from the original path
          let filename = file.original_filename?.split('/').pop() || file.displayName;
          
          // Handle filename conflicts by appending a number
          let finalFilename = filename;
          let counter = 1;
          while (existingFilenames.has(finalFilename)) {
            const parts = filename.split('.');
            if (parts.length > 1) {
              const ext = parts.pop();
              const name = parts.join('.');
              finalFilename = `${name}_${counter}.${ext}`;
            } else {
              finalFilename = `${filename}_${counter}`;
            }
            counter++;
          }
          
          const newPath = `${targetFolder}/${finalFilename}`;
          console.log(`Moving "${file.displayName}" to "${newPath}"`);
          
          const { error } = await supabase
            .from('project_files')
            .update({ 
              original_filename: newPath,
              updated_at: new Date().toISOString()
            })
            .eq('id', file.id);

          if (error) {
            console.error(`Failed to move file ${file.displayName}:`, error);
            failures.push(`${file.displayName}: ${error.message}`);
            failureCount++;
          } else {
            console.log(`Successfully moved "${file.displayName}" to "${newPath}"`);
            existingFilenames.add(finalFilename); // Add to conflict checker
            successCount++;
          }
        } catch (error) {
          console.error(`Error processing file ${file.displayName}:`, error);
          failures.push(`${file.displayName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          failureCount++;
        }
      }

      console.log(`Move operation completed. Success: ${successCount}, Failures: ${failureCount}`);

      // Show appropriate toast based on results
      if (failureCount === 0) {
        toast({
          title: "Success",
          description: `Moved ${successCount} file(s) to "${targetFolder}" folder`,
        });
        onSuccess();
        handleClose();
      } else if (successCount === 0) {
        toast({
          title: "Move Failed",
          description: `Failed to move any files. ${failures.join(', ')}`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Partial Success",
          description: `Moved ${successCount} file(s). ${failureCount} failed: ${failures.join(', ')}`,
          variant: "destructive",
        });
        onSuccess(); // Refresh to show moved files
        handleClose();
      }
    } catch (error) {
      console.error('Error during move operation:', error);
      toast({
        title: "Move Error",
        description: error instanceof Error ? error.message : "Failed to move files to folder",
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
          <DialogTitle>Move Files to Folder</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="text-sm text-muted-foreground">
            Moving {selectedFiles.length} file(s)
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
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      No existing folders
                    </div>
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
            {isMoving ? "Moving..." : "Move Files"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}