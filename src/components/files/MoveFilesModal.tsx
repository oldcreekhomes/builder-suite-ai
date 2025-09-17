import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { FolderOpen, Home } from "lucide-react";

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

interface SimpleFolder {
  name: string;
  path: string;
}

interface MoveFilesModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedFileIds: string[];
  selectedFolderPaths?: string[];
  files: SimpleFile[];
  folders?: SimpleFolder[];
  onSuccess: () => void;
  projectId: string;
}

export function MoveFilesModal({ 
  isOpen, 
  onClose, 
  selectedFileIds, 
  selectedFolderPaths = [],
  files, 
  folders = [],
  onSuccess, 
  projectId 
}: MoveFilesModalProps) {
  const { toast } = useToast();
  const [existingFolders, setExistingFolders] = useState<string[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string>("");
  const [isMoving, setIsMoving] = useState(false);

  const selectedFiles = files.filter(file => selectedFileIds.includes(file.id));
  const selectedFolders = folders.filter(folder => selectedFolderPaths.includes(folder.path));

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
      setExistingFolders(folderList);
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
    if (selectedFolder === undefined || selectedFolder === null || selectedFolder === "") {
      toast({
        title: "Select Destination",
        description: "Please select a folder",
        variant: "destructive",
      });
      return;
    }

    if (selectedFiles.length === 0 && selectedFolders.length === 0) {
      toast({
        title: "No Items Selected",
        description: "Please select files or folders to move",
        variant: "destructive",
      });
      return;
    }

    setIsMoving(true);

    try {
      console.log(`Starting to move ${selectedFiles.length} files and ${selectedFolders.length} folders to "${selectedFolder}"`);
      
      let successCount = 0;
      let failureCount = 0;
      const failures: string[] = [];

      // First, move folders by updating all files within those folders
      for (const folder of selectedFolders) {
        try {
          console.log(`Moving folder: ${folder.path}`);
          
          // Get all files in this folder
          const { data: folderFiles, error: fetchError } = await supabase
            .from('project_files')
            .select('id, original_filename')
            .eq('project_id', projectId)
            .like('original_filename', `${folder.path}/%`)
            .eq('is_deleted', false);

          if (fetchError) throw fetchError;

            // Move each file in the folder
            if (folderFiles && folderFiles.length > 0) {
              for (const file of folderFiles) {
                const relativePath = file.original_filename.substring(folder.path.length + 1);
                const folderName = folder.path.split('/').pop(); // Get the actual folder name
                const newPath = selectedFolder === "ROOT" ? `${folderName}/${relativePath}` : `${selectedFolder}/${folderName}/${relativePath}`;
              
              const { error: updateError } = await supabase
                .from('project_files')
                .update({ 
                  original_filename: newPath,
                  updated_at: new Date().toISOString()
                })
                .eq('id', file.id);

              if (updateError) {
                console.error(`Failed to move file ${file.original_filename}:`, updateError);
                failures.push(`${folder.name}: ${updateError.message}`);
                failureCount++;
                break; // Stop processing this folder if any file fails
              }
            }
            
            if (!failures.some(f => f.includes(folder.name))) {
              console.log(`Successfully moved folder "${folder.path}"`);
              successCount++;
            }
          } else {
            // Empty folder - consider it successfully moved
            console.log(`Folder "${folder.path}" is empty - considered moved`);
            successCount++;
          }
        } catch (error) {
          console.error(`Error moving folder ${folder.path}:`, error);
          failures.push(`${folder.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          failureCount++;
        }
      }

      // Handle root folder case differently
      if (selectedFolder === "ROOT") {
        // Moving to root folder
        console.log("Moving files to root folder");
        
        // Get existing root files to check for conflicts  
        const { data: existingFiles } = await supabase
          .from('project_files')
          .select('original_filename')
          .eq('project_id', projectId)
          .eq('is_deleted', false)
          .not('original_filename', 'ilike', '%/%'); // Files without folder path

        const existingFilenames = new Set(
          existingFiles?.map(f => f.original_filename) || []
        );

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
            
            console.log(`Moving "${file.displayName}" to root as "${finalFilename}"`);
            
            const { error } = await supabase
              .from('project_files')
              .update({ 
                original_filename: finalFilename,
                updated_at: new Date().toISOString()
              })
              .eq('id', file.id);

            if (error) {
              console.error(`Failed to move file ${file.displayName}:`, error);
              failures.push(`${file.displayName}: ${error.message}`);
              failureCount++;
            } else {
              console.log(`Successfully moved "${file.displayName}" to root as "${finalFilename}"`);
              existingFilenames.add(finalFilename); // Add to conflict checker
              successCount++;
            }
          } catch (error) {
            console.error(`Error processing file ${file.displayName}:`, error);
            failures.push(`${file.displayName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            failureCount++;
          }
        }
      } else {
        // Moving to specific folder
        // Get existing files in target folder to check for conflicts
        const { data: existingFiles } = await supabase
          .from('project_files')
          .select('original_filename')
          .eq('project_id', projectId)
          .eq('is_deleted', false)
          .ilike('original_filename', `${selectedFolder}/%`);

        const existingFilenames = new Set(
          existingFiles?.map(f => f.original_filename?.split('/').pop()) || []
        );

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
            
            const newPath = `${selectedFolder}/${finalFilename}`;
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
      }

      console.log(`Move operation completed. Success: ${successCount}, Failures: ${failureCount}`);

      // Show appropriate toast based on results
      if (failureCount === 0) {
        toast({
          title: "Success",
          description: `Moved ${successCount} file(s) to ${selectedFolder === "ROOT" ? "root folder" : `"${selectedFolder}" folder`}`,
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
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Move Items to Folder</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="text-sm text-muted-foreground">
            Moving {selectedFiles.length} file(s) and {selectedFolders.length} folder(s)
          </div>

          <div className="space-y-2">
            <Label>Select Existing Folder</Label>
            <Select value={selectedFolder} onValueChange={setSelectedFolder}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a folder..." />
              </SelectTrigger>
              <SelectContent className="max-h-60 overflow-y-auto bg-white border border-gray-200 shadow-lg z-50">
                {/* Add Root folder option */}
                <SelectItem value="ROOT">
                  <div className="flex items-center">
                    <Home className="h-4 w-4 mr-2" />
                    Root / (Move to root folder)
                  </div>
                </SelectItem>
                
                {existingFolders.length === 0 ? (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    No other existing folders
                  </div>
                ) : (
                  existingFolders.map((folder) => (
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
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleMove} 
            disabled={isMoving || !selectedFolder}
          >
            {isMoving ? "Moving..." : "Move Items"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}