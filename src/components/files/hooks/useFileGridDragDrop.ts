
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface UseFileGridDragDropProps {
  uploadFileToFolder: (file: File, folderName: string) => Promise<boolean>;
  onRefresh: () => void;
}

// Helper function to process files from drag event
const processFilesFromDragEvent = async (dataTransfer: DataTransfer): Promise<File[]> => {
  const files: File[] = [];
  
  if (dataTransfer.items) {
    // Use DataTransferItemList for better support of folders and files
    const items = Array.from(dataTransfer.items);
    
    for (const item of items) {
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file && isValidFile(file)) {
          files.push(file);
        }
      }
    }
  } else if (dataTransfer.files) {
    // Fallback to FileList
    const fileList = Array.from(dataTransfer.files);
    files.push(...fileList.filter(file => isValidFile(file)));
  }
  
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
    return false;
  }
  
  // Filter out empty files
  if (file.size === 0) {
    return false;
  }
  
  return true;
};

export function useFileGridDragDrop({ uploadFileToFolder, onRefresh }: UseFileGridDragDropProps) {
  const { toast } = useToast();
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);
  const [draggedFileCount, setDraggedFileCount] = useState(0);

  const handleFolderDragOver = (e: React.DragEvent, folderName: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Count dragged files for better visual feedback
    const fileCount = e.dataTransfer.items ? 
      Array.from(e.dataTransfer.items).filter(item => item.kind === 'file').length : 
      e.dataTransfer.files?.length || 0;
    
    setDraggedFileCount(fileCount);
    setDragOverFolder(folderName);
  };

  const handleFolderDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolder(null);
    setDraggedFileCount(0);
  };

  const handleFolderDrop = async (e: React.DragEvent, folderName: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolder(null);
    setDraggedFileCount(0);

    try {
      // Process files from the drag event properly
      const droppedFiles = await processFilesFromDragEvent(e.dataTransfer);
      
      console.log(`Drag event processed: ${droppedFiles.length} valid files found`);
      droppedFiles.forEach((file, index) => {
        console.log(`File ${index + 1}: ${file.name} (${file.size} bytes, type: ${file.type})`);
      });
      
      if (droppedFiles.length === 0) {
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

      console.log(`Processing ${droppedFiles.length} files for upload to folder: ${folderName}`);
      
      // Upload files sequentially to avoid race conditions
      let successCount = 0;
      let failedCount = 0;
      
      for (const file of droppedFiles) {
        console.log(`Uploading file ${successCount + failedCount + 1} of ${droppedFiles.length}: ${file.name}`);
        const success = await uploadFileToFolder(file, folderName);
        if (success) {
          successCount++;
        } else {
          failedCount++;
        }
      }
      
      console.log(`Upload completed: ${successCount} successful, ${failedCount} failed`);

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
      console.error('Error processing dropped files:', error);
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
    handleFolderDragLeave,
    handleFolderDrop,
  };
}
