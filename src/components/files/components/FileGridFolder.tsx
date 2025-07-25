
import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Folder, ChevronRight, ChevronDown, Download, Share2, FolderPlus, Edit, Check, X } from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface FileGridFolderProps {
  folderPath: string;
  folderFiles: any[];
  isExpanded: boolean;
  isDragOver: boolean;
  draggedFileCount?: number;
  onToggleFolder: (folderPath: string) => void;
  onDragOver: (e: React.DragEvent, folderName: string) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, folderName: string) => void;
  onShareFolder: (folderPath: string, files: any[]) => void;
  onCreateSubfolder: (parentPath: string) => void;
  onRefresh?: () => void;
}

export function FileGridFolder({
  folderPath,
  folderFiles,
  isExpanded,
  isDragOver,
  draggedFileCount = 0,
  onToggleFolder,
  onDragOver,
  onDragLeave,
  onDrop,
  onShareFolder,
  onCreateSubfolder,
  onRefresh,
}: FileGridFolderProps) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  
  const handleDownloadFolder = () => {
    // TODO: Implement folder download
    console.log('Download folder:', folderPath);
  };

  const handleShareFolder = () => {
    onShareFolder(folderPath, folderFiles);
  };

  const handleCreateSubfolder = () => {
    onCreateSubfolder(folderPath);
  };

  const handleRenameFolder = () => {
    const displayName = folderPath === 'Root' ? 'Root Files' : 
      folderPath.split('/').pop() || folderPath;
    setEditName(displayName);
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!editName.trim()) {
      toast({
        title: "Error",
        description: "Folder name cannot be empty",
        variant: "destructive",
      });
      return;
    }

    if (folderPath === 'Root') {
      toast({
        title: "Error",
        description: "Cannot rename root folder",
        variant: "destructive",
      });
      return;
    }

    try {
      // Calculate the new folder path
      const pathParts = folderPath.split('/');
      pathParts[pathParts.length - 1] = editName.trim();
      const newFolderPath = pathParts.join('/');

      // Update all files in this folder and its subfolders
      const { data: filesToUpdate, error: fetchError } = await supabase
        .from('project_files')
        .select('id, original_filename')
        .like('original_filename', `${folderPath}%`);

      if (fetchError) throw fetchError;

      // Update each file's path
      for (const file of filesToUpdate || []) {
        const newFilename = file.original_filename.replace(folderPath, newFolderPath);
        const { error: updateError } = await supabase
          .from('project_files')
          .update({ 
            original_filename: newFilename,
            updated_at: new Date().toISOString()
          })
          .eq('id', file.id);

        if (updateError) throw updateError;
      }

      toast({
        title: "Success",
        description: "Folder renamed successfully",
      });
      
      setIsEditing(false);
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Error renaming folder:', error);
      toast({
        title: "Error",
        description: "Failed to rename folder",
        variant: "destructive",
      });
    }
  };

  const handleCancelEdit = () => {
    const displayName = folderPath === 'Root' ? 'Root Files' : 
      folderPath.split('/').pop() || folderPath;
    setEditName(displayName);
    setIsEditing(false);
  };
  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <Card 
          className={`p-3 cursor-pointer transition-colors ${
            isDragOver 
              ? 'bg-blue-100 border-blue-300' 
              : 'bg-gray-50 hover:bg-gray-100'
          }`}
          onDragOver={(e) => onDragOver(e, folderPath)}
          onDragLeave={onDragLeave}
          onDrop={(e) => onDrop(e, folderPath)}
        >
      <div 
        className="flex items-center space-x-3"
        onClick={() => onToggleFolder(folderPath)}
      >
        {isExpanded ? (
          <ChevronDown className="h-5 w-5 text-gray-500" />
        ) : (
          <ChevronRight className="h-5 w-5 text-gray-500" />
        )}
        <Folder className="h-6 w-6 text-blue-500" />
        <div className="flex-1">
          {isEditing ? (
            <div className="flex items-center space-x-2">
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="h-6 text-sm font-semibold"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveEdit();
                  if (e.key === 'Escape') handleCancelEdit();
                }}
                autoFocus
              />
              <Button size="sm" variant="ghost" onClick={handleSaveEdit} className="h-6 w-6 p-0">
                <Check className="h-3 w-3" />
              </Button>
              <Button size="sm" variant="ghost" onClick={handleCancelEdit} className="h-6 w-6 p-0">
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <>
              <h3 className="font-semibold text-gray-700">
                {folderPath === 'Root' ? 'Root Files' : folderPath.split('/').pop() || folderPath}
              </h3>
              <p className="text-sm text-gray-500">
                {folderFiles.length} file{folderFiles.length !== 1 ? 's' : ''}
                {isDragOver && (
                  <span className="text-blue-600 ml-2 font-medium">
                    {draggedFileCount > 1 
                      ? `• Drop ${draggedFileCount} files here` 
                      : '• Drop file here'
                    }
                  </span>
                )}
              </p>
            </>
          )}
        </div>
      </div>
    </Card>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={handleCreateSubfolder}>
          <FolderPlus className="h-4 w-4 mr-2" />
          New Subfolder
        </ContextMenuItem>
        <ContextMenuItem onClick={handleRenameFolder} disabled={folderPath === 'Root'}>
          <Edit className="h-4 w-4 mr-2" />
          Rename
        </ContextMenuItem>
        <ContextMenuItem onClick={handleDownloadFolder}>
          <Download className="h-4 w-4 mr-2" />
          Download All
        </ContextMenuItem>
        <ContextMenuItem onClick={handleShareFolder}>
          <Share2 className="h-4 w-4 mr-2" />
          Share
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
