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
    const folderPaths = new Set<string>();
    
    const items = Array.from(dataTransfer.items);
    console.log('Processing drag items:', items.length);
    
    for (const item of items) {
      if (item.kind === 'file') {
        const entry = item.webkitGetAsEntry?.();
        if (entry) {
          console.log('Processing entry:', entry.name, 'isDirectory:', entry.isDirectory);
          const baseFolder = targetFolder === 'Root' ? '' : targetFolder + '/';
          await traverseFileTree(entry, baseFolder, files, folderPaths);
        }
      }
    }
    
    console.log('All detected folder paths:', Array.from(folderPaths));
    console.log('All files to upload:', files.map(f => f.relativePath));
    
    // Filter out invalid files
    const validFiles = files.filter(({ file, relativePath }) => isValidFile(file, relativePath));
    
    return validFiles;
  };

  const traverseFileTree = (item: any, currentPath: string, files: Array<{ file: File; relativePath: string }>, folderPaths: Set<string>) => {
    return new Promise<void>((resolve) => {
      console.log('Traversing:', item.name, 'currentPath:', currentPath, 'isDirectory:', item.isDirectory);
      
      if (item.isFile) {
        item.file((file: File) => {
          const fullPath = currentPath + file.name;
          console.log('File found:', fullPath);
          if (isValidFile(file, fullPath)) {
            files.push({ file, relativePath: fullPath });
            
            // Track all folder paths in the hierarchy for this file
            const folderPath = fullPath.substring(0, fullPath.lastIndexOf('/'));
            if (folderPath) {
              console.log('Adding folder path from file:', folderPath);
              folderPaths.add(folderPath);
              
              // Add all parent folders in the hierarchy
              const parts = folderPath.split('/');
              for (let i = 1; i <= parts.length; i++) {
                const parentPath = parts.slice(0, i).join('/');
                if (parentPath) {
                  console.log('Adding parent folder path:', parentPath);
                  folderPaths.add(parentPath);
                }
              }
            }
          }
          resolve();
        });
      } else if (item.isDirectory) {
        const dirReader = item.createReader();
        
        const readEntries = () => {
          dirReader.readEntries((entries: any[]) => {
            const newPath = currentPath + item.name + '/';
            
            // Always add the directory to folderPaths
            const folderPath = newPath.slice(0, -1); // Remove trailing slash
            console.log('Adding directory path:', folderPath);
            folderPaths.add(folderPath);
            
            // Add all parent folders in the hierarchy
            const parts = folderPath.split('/');
            for (let i = 1; i <= parts.length; i++) {
              const parentPath = parts.slice(0, i).join('/');
              if (parentPath) {
                console.log('Adding parent directory path:', parentPath);
                folderPaths.add(parentPath);
              }
            }
            
            if (entries.length === 0) {
              console.log('Empty directory:', folderPath);
              resolve();
            } else {
              console.log('Directory has', entries.length, 'entries');
              const promises = entries.map(entry => 
                traverseFileTree(entry, newPath, files, folderPaths)
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

  const createFolderKeeper = async (folderPath: string) => {
    try {
      const placeholderContent = new Blob([''], { type: 'text/plain' });
      const placeholderFile = new File([placeholderContent], '.folderkeeper', {
        type: 'text/plain'
      });
      
      return await uploadFileToFolder(placeholderFile, `${folderPath}/.folderkeeper`);
    } catch (error) {
      console.error('Error creating folder keeper:', error);
      return false;
    }
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

    // Get all unique folder paths from the dragged files AND ensure all parent paths exist
    const folderPaths = new Set<string>();
    
    filesWithPaths.forEach(({ relativePath }) => {
      const folderPath = relativePath.substring(0, relativePath.lastIndexOf('/'));
      if (folderPath) {
        // Split the path and create all parent folders
        const parts = folderPath.split('/');
        for (let i = 0; i < parts.length; i++) {
          const parentPath = parts.slice(0, i + 1).join('/');
          if (parentPath) {
            folderPaths.add(parentPath);
          }
        }
      }
    });

    // Also add any folders that were detected during traversal but might not have files
    const allFolderPaths = Array.from(folderPaths);
    allFolderPaths.forEach(folderPath => {
      const parts = folderPath.split('/');
      for (let i = 0; i < parts.length; i++) {
        const parentPath = parts.slice(0, i + 1).join('/');
        if (parentPath) {
          folderPaths.add(parentPath);
        }
      }
    });

    console.log('Final folder paths to create:', Array.from(folderPaths).sort());

    // Create folderkeeper files for all folders
    const folderPromises = Array.from(folderPaths).map(folderPath => 
      createFolderKeeper(folderPath)
    );

    const uploadPromises = filesWithPaths.map(({ file, relativePath }) => 
      uploadFileToFolder(file, relativePath)
    );
    
    const allPromises = [...folderPromises, ...uploadPromises];
    const results = await Promise.all(allPromises);
    const successCount = results.filter(Boolean).length;

    if (successCount > 0) {
      toast({
        title: "Upload Complete",
        description: `Successfully uploaded ${filesWithPaths.length} file(s) to ${folderName}`,
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
