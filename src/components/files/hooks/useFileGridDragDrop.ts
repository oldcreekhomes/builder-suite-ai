
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface UseFileGridDragDropProps {
  uploadFileToFolder: (file: File, folderName: string) => Promise<boolean>;
  onRefresh: () => void;
}

export function useFileGridDragDrop({ uploadFileToFolder, onRefresh }: UseFileGridDragDropProps) {
  const { toast } = useToast();
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);

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

    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length === 0) return;

    toast({
      title: "Uploading files",
      description: `Uploading ${droppedFiles.length} file(s) to ${folderName}...`,
    });

    const uploadPromises = droppedFiles.map(file => uploadFileToFolder(file, folderName));
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
}
