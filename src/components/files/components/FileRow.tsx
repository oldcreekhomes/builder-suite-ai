
import React, { useState } from "react";
import { TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Download, Trash2, Edit, Check, X } from "lucide-react";
import { format } from "date-fns";
import { getDisplayName, formatFileSize, getFileTypeColor } from "../utils/fileUtils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface FileRowProps {
  file: any;
  isSelected: boolean;
  onSelectFile: (fileId: string, checked: boolean) => void;
  onFileSelect: (file: any) => void;
  onDownload: (file: any) => void;
  onDelete: (file: any) => void;
  onRefresh?: () => void;
}

export function FileRow({
  file,
  isSelected,
  onSelectFile,
  onFileSelect,
  onDownload,
  onDelete,
  onRefresh,
}: FileRowProps) {
  const displayInfo = getDisplayName(file.original_filename);
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(displayInfo.pathWithinFolder || displayInfo.fileName);

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
      const { error } = await supabase
        .from('project_files')
        .update({ 
          original_filename: editName,
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
    setEditName(displayInfo.pathWithinFolder || displayInfo.fileName);
    setIsEditing(false);
  };

  return (
    <TableRow className="hover:bg-gray-50">
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
              {displayInfo.pathWithinFolder || displayInfo.fileName}
            </div>
          )}
          {file.description && !isEditing && (
            <div className="text-sm text-gray-500 mt-1">
              {file.description}
            </div>
          )}
        </div>
      </TableCell>
      <TableCell>
        <Badge className={getFileTypeColor(file.file_type)}>
          {file.file_type.toUpperCase()}
        </Badge>
      </TableCell>
      <TableCell>{formatFileSize(file.file_size)}</TableCell>
      <TableCell>{file.uploaded_by_profile?.email || 'Unknown'}</TableCell>
      <TableCell>{format(new Date(file.uploaded_at), 'MMM dd, yyyy')}</TableCell>
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
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(file)}
                className="text-red-600 hover:text-red-800 hover:bg-red-100"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}
