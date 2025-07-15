
import React, { useState } from "react";
import { TableRow, TableCell } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
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

interface FolderHeaderProps {
  folderPath: string;
  folderFiles: any[];
  isExpanded: boolean;
  isDragOver: boolean;
  isSelected: boolean;
  onToggleFolder: (folderPath: string) => void;
  onSelectFolder: (folderPath: string, checked: boolean) => void;
  onDragOver: (e: React.DragEvent, folderName: string) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, folderName: string) => void;
  onShareFolder: (folderPath: string, files: any[]) => void;
  onCreateSubfolder: (parentPath: string) => void;
  onRefresh?: () => void;
}

export function FolderHeader({
  folderPath,
  folderFiles,
  isExpanded,
  isDragOver,
  isSelected,
  onToggleFolder,
  onSelectFolder,
  onDragOver,
  onDragLeave,
  onDrop,
  onShareFolder,
  onCreateSubfolder,
  onRefresh,
}: FolderHeaderProps) {
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
  // Calculate folder depth for indentation
  const folderDepth = folderPath === 'Root' ? 0 : folderPath.split('/').length;
  const indentLevel = Math.max(0, folderDepth - 1);
  
  // Get display name (last part of the path for nested folders)
  const displayName = folderPath === 'Root' ? 'Root Files' : 
    folderPath.split('/').pop() || folderPath;
  
  // Show full path in subtle text for nested folders
  const showFullPath = folderPath !== 'Root' && folderPath.includes('/');
  
  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Checkbox click prevented propagation for:', folderPath);
  };
  
  const handleCheckboxChange = (checked: boolean) => {
    console.log('Checkbox changed for folder:', folderPath, 'checked:', checked);
    onSelectFolder(folderPath, checked);
  };
  
  const handleToggleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Toggle button clicked for folder:', folderPath, 'current expanded:', isExpanded);
    onToggleFolder(folderPath);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDragOver(e, folderPath);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDragLeave(e);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDrop(e, folderPath);
  };
  
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <TableRow 
          className={`border-b-2 transition-colors ${
            isDragOver 
              ? 'bg-blue-100 border-blue-300' 
              : 'bg-gray-50 hover:bg-gray-100'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <TableCell className="w-12">
            <div onClick={handleCheckboxClick}>
              <Checkbox
                checked={isSelected}
                onCheckedChange={handleCheckboxChange}
              />
            </div>
          </TableCell>
          <TableCell colSpan={6}>
            <div className="flex items-center space-x-2 py-1">
              <div 
                className="flex items-center space-x-2 cursor-pointer flex-1 hover:bg-gray-200 rounded p-1 transition-colors"
                style={{ paddingLeft: `${indentLevel * 20}px` }}
                onClick={handleToggleClick}
              >
                <div className="flex items-center space-x-2 min-w-0 flex-1">
                  <div className="flex-shrink-0">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-gray-500" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gray-500" />
                    )}
                  </div>
                  <Folder className="h-5 w-5 text-blue-500 flex-shrink-0" />
                  <div className="flex flex-col min-w-0 flex-1">
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
                        <span className="font-semibold text-gray-700 truncate">
                          {displayName}
                        </span>
                        {showFullPath && (
                          <span className="text-xs text-gray-500 truncate">
                            {folderPath}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                  <span className="text-sm text-gray-500 flex-shrink-0">
                    ({folderFiles.length} file{folderFiles.length !== 1 ? 's' : ''})
                  </span>
                </div>
              </div>
              {isDragOver && (
                <span className="text-sm text-blue-600 ml-2 flex-shrink-0">
                  Drop files here to upload to this folder
                </span>
              )}
            </div>
          </TableCell>
        </TableRow>
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
