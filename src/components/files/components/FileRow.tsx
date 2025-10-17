
import React, { useState } from "react";
import { TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Download, Edit, Check, X, Share2, Eye } from "lucide-react";
import { format } from "date-fns";
import { getFileName, formatFileSize, getFileTypeColor } from "../utils/simplifiedFileUtils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DeleteButton } from "@/components/ui/delete-button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { useUniversalFilePreviewContext } from "@/components/files/UniversalFilePreviewProvider";
interface FileRowProps {
  file: any;
  isSelected: boolean;
  onSelectFile: (fileId: string, checked: boolean) => void;
  onFileSelect: (file: any) => void;
  onDownload: (file: any) => void;
  onDelete: (file: any) => void;
  onRefresh?: () => void;
  onShare: (file: any) => void;
  isDragging?: boolean;
  fileDragProps?: any;
}

export function FileRow({
  file,
  isSelected,
  onSelectFile,
  onFileSelect,
  onDownload,
  onDelete,
  onRefresh,
  onShare,
  isDragging = false,
  fileDragProps = {},
}: FileRowProps) {
  const fileName = getFileName(file.original_filename);
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(fileName);
  const { openProjectFile } = useUniversalFilePreviewContext();

  const handleSaveEdit = async () => {
    if (!editName.trim()) {
      toast({
        title: "Error",
        description: "File name cannot be empty",
        variant: "destructive",
      });
      return;
    }

    try {
      // Preserve folder structure when renaming
      const originalPath = file.original_filename;
      const lastSlashIndex = originalPath.lastIndexOf('/');
      const newFilename = lastSlashIndex !== -1 
        ? originalPath.substring(0, lastSlashIndex + 1) + editName
        : editName;

      const { error } = await supabase
        .from('project_files')
        .update({ 
          original_filename: newFilename,
          updated_at: new Date().toISOString()
        })
        .eq('id', file.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "File name updated successfully",
      });
      
      setIsEditing(false);
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Error updating file name:', error);
      toast({
        title: "Error",
        description: "Failed to update file name",
        variant: "destructive",
      });
    }
  };

  const handleCancelEdit = () => {
    setEditName(fileName);
    setIsEditing(false);
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from('project_files')
        .update({ is_deleted: true, updated_at: new Date().toISOString() })
        .eq('id', file.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "File deleted successfully",
      });
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Delete Error",
        description: "Failed to delete file",
        variant: "destructive",
      });
    }
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <TableRow 
          className={`hover:bg-gray-50 ${isDragging ? 'opacity-50' : ''}`}
          {...fileDragProps}
        >
      <TableCell>
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => onSelectFile(file.id, checked as boolean)}
        />
      </TableCell>
      <TableCell 
        className={!isEditing ? "cursor-pointer hover:text-blue-600" : ""}
        onClick={!isEditing ? () => onFileSelect(file) : undefined}
      >
        <div>
          {isEditing ? (
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="font-medium"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveEdit();
                if (e.key === 'Escape') handleCancelEdit();
              }}
              autoFocus
            />
          ) : (
            <div className="font-medium">
              {fileName}
            </div>
          )}
          {file.description && !isEditing && (
            <div className="text-sm text-gray-500 mt-1">
              {file.description}
            </div>
          )}
        </div>
      </TableCell>
      <TableCell 
        className="cursor-pointer hover:bg-gray-50"
        onClick={() => onFileSelect(file)}
      >
        <Badge className={getFileTypeColor(file.file_type)}>
          {file.file_type.toUpperCase()}
        </Badge>
      </TableCell>
      <TableCell 
        className="cursor-pointer hover:bg-gray-50"
        onClick={() => onFileSelect(file)}
      >
        {formatFileSize(file.file_size)}
      </TableCell>
      <TableCell 
        className="cursor-pointer hover:bg-gray-50"
        onClick={() => onFileSelect(file)}
      >
        {file.uploaded_by_profile?.email || 'Unknown'}
      </TableCell>
      <TableCell 
        className="cursor-pointer hover:bg-gray-50"
        onClick={() => onFileSelect(file)}
      >
        {format(new Date(file.uploaded_at), 'MMM dd, yyyy')}
      </TableCell>
      <TableCell>
        <div className="flex items-center space-x-2">
          {isEditing ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSaveEdit}
                className="text-green-600 hover:text-green-800 hover:bg-green-100"
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancelEdit}
                className="text-gray-600 hover:text-gray-800 hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="text-blue-600 hover:text-blue-800 hover:bg-blue-100"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDownload(file)}
                className="text-gray-600 hover:text-gray-800 hover:bg-gray-100"
              >
                <Download className="h-4 w-4" />
              </Button>
              <DeleteButton
                onDelete={handleDelete}
                title="Delete File"
                description={`Are you sure you want to delete "${fileName}"? This action cannot be undone.`}
                size="sm"
                variant="ghost"
                showIcon={true}
              />
            </>
          )}
        </div>
      </TableCell>
    </TableRow>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={() => onFileSelect(file)}>
          <Eye className="h-4 w-4 mr-2" />
          View
        </ContextMenuItem>
        <ContextMenuItem onClick={() => onDownload(file)}>
          <Download className="h-4 w-4 mr-2" />
          Download
        </ContextMenuItem>
        <ContextMenuItem onClick={() => onShare(file)}>
          <Share2 className="h-4 w-4 mr-2" />
          Create Link & Share
        </ContextMenuItem>
        <ContextMenuItem onClick={() => setIsEditing(true)}>
          <Edit className="h-4 w-4 mr-2" />
          Rename
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
