import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface UseFileDragDropProps {
  moveFileToFolder: (fileId: string, targetFolder: string) => Promise<boolean>;
  onRefresh: () => void;
  selectedFiles: Set<string>;
}

export function useFileDragDrop({ moveFileToFolder, onRefresh, selectedFiles }: UseFileDragDropProps) {
  const { toast } = useToast();
  const [draggedFiles, setDraggedFiles] = useState<string[]>([]);
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileDragStart = (e: React.DragEvent, fileId: string) => {
    e.stopPropagation();
    setIsDragging(true);
    
    // If the dragged file is selected, include all selected files
    const filesToDrag = selectedFiles.has(fileId) 
      ? Array.from(selectedFiles)
      : [fileId];
    
    setDraggedFiles(filesToDrag);
    
    // Set drag data
    e.dataTransfer.setData('text/plain', JSON.stringify({
      type: 'files',
      fileIds: filesToDrag
    }));
    
    // Set drag effect
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleFileDragEnd = (e: React.DragEvent) => {
    e.stopPropagation();
    setIsDragging(false);
    setDraggedFiles([]);
    setDragOverFolder(null);
  };

  const handleFolderDragOver = (e: React.DragEvent, folderPath: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Check if we're dragging files
    const dragData = e.dataTransfer.types.includes('text/plain');
    if (dragData) {
      e.dataTransfer.dropEffect = 'move';
      setDragOverFolder(folderPath);
    }
  };

  const handleFolderDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Only clear drag over if we're leaving the folder element
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOverFolder(null);
    }
  };

  const handleFolderDrop = async (e: React.DragEvent, targetFolder: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolder(null);
    setIsDragging(false);

    try {
      const dragDataText = e.dataTransfer.getData('text/plain');
      if (!dragDataText) return;

      const dragData = JSON.parse(dragDataText);
      if (dragData.type !== 'files') return;

      const fileIds = dragData.fileIds as string[];
      if (!fileIds || fileIds.length === 0) return;

      toast({
        title: "Moving files",
        description: `Moving ${fileIds.length} file(s) to ${targetFolder === '__LOOSE_FILES__' ? 'root' : targetFolder}...`,
      });

      // Move each file
      const movePromises = fileIds.map(fileId => moveFileToFolder(fileId, targetFolder));
      const results = await Promise.all(movePromises);
      const successCount = results.filter(Boolean).length;

      if (successCount > 0) {
        toast({
          title: "Files moved",
          description: `Successfully moved ${successCount} file(s) to ${targetFolder === '__LOOSE_FILES__' ? 'root' : targetFolder}`,
        });
        onRefresh();
      } else {
        toast({
          title: "Move failed",
          description: "Failed to move files",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error moving files:', error);
      toast({
        title: "Move failed",
        description: "An error occurred while moving files",
        variant: "destructive",
      });
    }
  };

  const getFileDragProps = (fileId: string) => ({
    draggable: true,
    onDragStart: (e: React.DragEvent) => handleFileDragStart(e, fileId),
    onDragEnd: handleFileDragEnd,
  });

  const getFolderDropProps = (folderPath: string) => ({
    onDragOver: (e: React.DragEvent) => handleFolderDragOver(e, folderPath),
    onDragLeave: handleFolderDragLeave,
    onDrop: (e: React.DragEvent) => handleFolderDrop(e, folderPath),
  });

  return {
    isDragging,
    draggedFiles,
    dragOverFolder,
    getFileDragProps,
    getFolderDropProps,
  };
}