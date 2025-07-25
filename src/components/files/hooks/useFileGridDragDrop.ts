import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface UseFileGridDragDropProps {
  uploadFileToFolder: (file: File, folderName: string) => Promise<boolean>;
  onRefresh: () => void;
}

// Helper function to process files from drag event
const processFilesFromDragEvent = async (dataTransfer: DataTransfer): Promise<File[]> => {
  const files: File[] = [];
  
  console.log("PROCESSING FILES - dataTransfer.items:", dataTransfer.items?.length);
  console.log("PROCESSING FILES - dataTransfer.files:", dataTransfer.files?.length);
  
  if (dataTransfer.items) {
    // Use DataTransferItemList for better support of folders and files
    const items = Array.from(dataTransfer.items);
    console.log("Using dataTransfer.items, found items:", items.length);
    
    for (const item of items) {
      console.log("Processing item:", item.kind, item.type);
      if (item.kind === 'file') {
        const file = item.getAsFile();
        console.log("Got file from item:", file?.name, file?.size);
        if (file && isValidFile(file)) {
          console.log("File is valid, adding to list:", file.name);
          files.push(file);
        } else {
          console.log("File is invalid or null:", file?.name);
        }
      }
    }
  } else if (dataTransfer.files) {
    // Fallback to FileList
    console.log("Using dataTransfer.files fallback");
    const fileList = Array.from(dataTransfer.files);
    console.log("FileList contains:", fileList.length, "files");
    fileList.forEach((file, index) => {
      console.log(`File ${index}:`, file.name, file.size, "valid:", isValidFile(file));
    });
    files.push(...fileList.filter(file => isValidFile(file)));
  }
  
  console.log("FINAL PROCESSED FILES COUNT:", files.length);
  return files;
};

// Filter out system files and unwanted files
const isValidFile = (file: File): boolean => {
  const name = file.name.toLowerCase();
  
  // Filter out system files
  if (name.startsWith('.ds_store') || 
      name.startsWith('thumbs.db') || 
      name.startsWith('desktop.ini') ||
      name.startsWith('.')) {
    console.log("File rejected - system file:", name);
    return false;
  }
  
  // Filter out empty files
  if (file.size === 0) {
    console.log("File rejected - empty file:", name);
    return false;
  }
  
  console.log("File accepted:", name);
  return true;
};

export function useFileGridDragDrop({ uploadFileToFolder, onRefresh }: UseFileGridDragDropProps) {
  const { toast } = useToast();
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);
  const [draggedFileCount, setDraggedFileCount] = useState(0);

  const handleFolderDragOver = (e: React.DragEvent, folderName: string) => {
    console.log("DRAG OVER EVENT - folder:", folderName);
    e.preventDefault();
    e.stopPropagation();
    
    // Set the correct drop effect
    e.dataTransfer.dropEffect = 'copy';
    
    // Count dragged files for better visual feedback
    const fileCount = e.dataTransfer.items ? 
      Array.from(e.dataTransfer.items).filter(item => item.kind === 'file').length : 
      e.dataTransfer.files?.length || 0;
    
    console.log("Files being dragged:", fileCount);
    setDraggedFileCount(fileCount);
    setDragOverFolder(folderName);
  };

  const handleFolderDragEnter = (e: React.DragEvent, folderName: string) => {
    console.log("DRAG ENTER EVENT - folder:", folderName);
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleFolderDragLeave = (e: React.DragEvent) => {
    console.log("DRAG LEAVE EVENT");
    e.preventDefault();
    e.stopPropagation();
    
    // Only clear if we're actually leaving the drop zone
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const isStillInside = (
      e.clientX >= rect.left &&
      e.clientX <= rect.right &&
      e.clientY >= rect.top &&
      e.clientY <= rect.bottom
    );
    
    if (!isStillInside) {
      setDragOverFolder(null);
      setDraggedFileCount(0);
    }
  };

  const handleFolderDrop = async (e: React.DragEvent, folderName: string) => {
    console.log("=== DROP EVENT TRIGGERED ===");
    console.log("Event type:", e.type);
    console.log("Target:", e.target);
    console.log("CurrentTarget:", e.currentTarget);
    
    // Prevent all default behaviors
    e.preventDefault();
    e.stopPropagation();
    
    setDragOverFolder(null);
    setDraggedFileCount(0);

    console.log("Raw files count:", e.dataTransfer.files.length);
    console.log("Target folder:", folderName);

    try {
      // Process files from the drag event properly
      const droppedFiles = await processFilesFromDragEvent(e.dataTransfer);
      
      console.log(`=== AFTER PROCESSING: ${droppedFiles.length} valid files found ===`);
      droppedFiles.forEach((file, index) => {
        console.log(`File ${index + 1}: ${file.name} (${file.size} bytes, type: ${file.type})`);
      });
      
      if (droppedFiles.length === 0) {
        console.log("NO FILES TO UPLOAD - showing toast");
        toast({
          title: "No files to upload",
          description: "No valid files were found in the drop",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Uploading files",
        description: `Uploading ${droppedFiles.length} file(s) to ${folderName === 'Root' ? 'root folder' : folderName}...`,
      });

      console.log(`=== STARTING UPLOAD PROCESS: ${droppedFiles.length} files to folder: ${folderName} ===`);
      
      // Upload files sequentially to avoid race conditions
      let successCount = 0;
      let failedCount = 0;
      
      for (const file of droppedFiles) {
        console.log(`=== CALLING uploadFileToFolder for: ${file.name} ===`);
        const success = await uploadFileToFolder(file, folderName);
        console.log(`Upload result for ${file.name}:`, success);
        if (success) {
          successCount++;
        } else {
          failedCount++;
        }
      }
      
      console.log(`=== UPLOAD COMPLETED: ${successCount} successful, ${failedCount} failed ===`);

      if (successCount > 0) {
        toast({
          title: "Upload Complete",
          description: `Successfully uploaded ${successCount} file(s) to ${folderName === 'Root' ? 'root folder' : folderName}${failedCount > 0 ? `. ${failedCount} file(s) failed.` : ''}`,
        });
        onRefresh();
      } else {
        toast({
          title: "Upload Failed",
          description: "All file uploads failed",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('=== ERROR processing dropped files ===:', error);
      toast({
        title: "Upload Error",
        description: "An error occurred while processing the dropped files",
        variant: "destructive",
      });
    }
  };

  return {
    dragOverFolder,
    draggedFileCount,
    handleFolderDragOver,
    handleFolderDragEnter,
    handleFolderDragLeave,
    handleFolderDrop,
  };
}