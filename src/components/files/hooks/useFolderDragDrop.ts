import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface UseFolderDragDropProps {
  uploadFileToFolder: (file: File, folderName: string) => Promise<boolean>;
  onRefresh: () => void;
}

export const useFolderDragDrop = ({ uploadFileToFolder, onRefresh }: UseFolderDragDropProps) => {
  const { toast } = useToast();
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);

  const processFilesFromDataTransfer = async (dataTransfer: DataTransfer, targetFolder: string) => {
    const files: Array<{ file: File; relativePath: string }> = [];
    
    const items = Array.from(dataTransfer.items);
    
    // Collect root entries to determine the intended folder structure
    const rootEntries: Array<{ entry: any; isDirectory: boolean }> = [];
    
    for (const item of items) {
      if (item.kind === 'file') {
        const entry = item.webkitGetAsEntry?.();
        if (entry) {
          rootEntries.push({ entry, isDirectory: entry.isDirectory });
        }
      }
    }
    
    // Process all root entries concurrently
    const promises = rootEntries.map(async ({ entry, isDirectory }) => {
      if (isDirectory) {
        // For directories, preserve their internal structure within the target folder
        const rootFolderName = targetFolder === 'Root' ? entry.name : `${targetFolder}/${entry.name}`;
        await traverseFileTree(entry, '', files, rootFolderName);
      } else {
        // For loose files, add them directly to the target folder
        const rootFolderName = targetFolder === 'Root' ? '' : targetFolder;
        await traverseFileTree(entry, '', files, rootFolderName);
      }
    });
    
    // Handle fallback for browsers that don't support webkitGetAsEntry
    if (rootEntries.length === 0) {
      const promises = items.map(async (item) => {
        if (item.kind === 'file') {
          const file = item.getAsFile();
          if (file && isValidFile(file)) {
            const relativePath = targetFolder === 'Root' ? file.name : `${targetFolder}/${file.name}`;
            files.push({ file, relativePath });
          }
        }
      });
      await Promise.all(promises);
    } else {
      await Promise.all(promises);
    }
    
    // Filter out invalid files
    const validFiles = files.filter(({ file, relativePath }) => isValidFile(file, relativePath));
    
    return validFiles;
  };

  const traverseFileTree = (item: any, currentPath: string, files: Array<{ file: File; relativePath: string }>, rootFolderName: string) => {
    return new Promise<void>((resolve) => {
      if (item.isFile) {
        item.file((file: File) => {
          // Build the correct relative path
          let fullPath: string;
          
          if (rootFolderName) {
            // For files in folders, include the root folder path and current nested structure
            fullPath = currentPath ? `${rootFolderName}/${currentPath}${file.name}` : `${rootFolderName}/${file.name}`;
          } else {
            // For loose files, just use the current path
            fullPath = currentPath + file.name;
          }
          
          if (isValidFile(file, fullPath)) {
            files.push({ file, relativePath: fullPath });
          }
          resolve();
        });
      } else if (item.isDirectory) {
        const dirReader = item.createReader();
        
        const readEntries = () => {
          dirReader.readEntries((entries: any[]) => {
            if (entries.length === 0) {
              resolve();
            } else {
              const newPath = currentPath + item.name + '/';
              const promises = entries.map(entry => 
                traverseFileTree(entry, newPath, files, rootFolderName)
              );
              Promise.all(promises).then(() => {
                readEntries();
              });
            }
          });
        };
        
        readEntries();
      } else {
        resolve();
      }
    });
  };

  const isValidFile = (file: File, relativePath: string = '') => {
    const fileName = file.name;
    const systemFiles = ['.DS_Store', 'Thumbs.db', '.gitkeep', '.gitignore'];
    const hiddenFiles = fileName.startsWith('.');
    
    // Allow .gitignore and .gitkeep as they're legitimate files
    if (fileName === '.gitignore' || fileName === '.gitkeep') {
      return true;
    }
    
    // Filter out system files and other hidden files
    if (systemFiles.includes(fileName) || (hiddenFiles && fileName !== '.gitignore' && fileName !== '.gitkeep')) {
      return false;
    }
    
    return true;
  };

  const handleFolderDragOver = (e: React.DragEvent, folderName: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolder(folderName);
  };

  const handleFolderDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolder(null);
  };

  const handleFolderDrop = async (e: React.DragEvent, folderName: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolder(null);

    const filesWithPaths = await processFilesFromDataTransfer(e.dataTransfer, folderName);
    
    if (filesWithPaths.length === 0) {
      toast({
        title: "No Valid Files",
        description: "No valid files found to upload (system files like .DS_Store are filtered out)",
      });
      return;
    }

    toast({
      title: "Uploading files",
      description: `Uploading ${filesWithPaths.length} file(s) to ${folderName}...`,
    });

    const uploadPromises = filesWithPaths.map(({ file, relativePath }) => 
      uploadFileToFolder(file, relativePath)
    );
    const results = await Promise.all(uploadPromises);
    const successCount = results.filter(Boolean).length;

    if (successCount > 0) {
      toast({
        title: "Upload Complete",
        description: `Successfully uploaded ${successCount} file(s) to ${folderName}`,
      });
      onRefresh();
    } else {
      toast({
        title: "Upload Failed",
        description: "Failed to upload files",
        variant: "destructive",
      });
    }
  };

  return {
    dragOverFolder,
    handleFolderDragOver,
    handleFolderDragLeave,
    handleFolderDrop,
  };
};
