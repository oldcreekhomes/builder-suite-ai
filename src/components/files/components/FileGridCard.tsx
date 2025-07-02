
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { FileText, Download, Eye, Edit, Check, X, Image, Share2 } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatFileSize, getDisplayName, getFileTypeColor } from "../utils/fileGridUtils";
import { DeleteButton } from "@/components/ui/delete-button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

interface FileGridCardProps {
  file: any;
  isSelected: boolean;
  onSelectFile: (fileId: string, checked: boolean) => void;
  onFileSelect: (file: any) => void;
  onRefresh: () => void;
  onShare: (file: any) => void;
}

export function FileGridCard({ file, isSelected, onSelectFile, onFileSelect, onRefresh, onShare }: FileGridCardProps) {
  const { toast } = useToast();
  const [editingFile, setEditingFile] = useState<string | null>(null);
  const [editName, setEditName] = useState<string>('');

  const displayInfo = getDisplayName(file.original_filename);
  const isEditing = editingFile === file.id;

  const getFileIcon = (fileType: string) => {
    if (['jpg', 'jpeg', 'png', 'gif'].includes(fileType)) {
      return <Image className="h-8 w-8 text-purple-500" />;
    }
    return <FileText className="h-8 w-8 text-blue-500" />;
  };

  const startEditingFile = (fileId: string, currentName: string) => {
    setEditingFile(fileId);
    setEditName(currentName);
  };

  const handleSaveEdit = async (fileId: string) => {
    if (!editName?.trim()) {
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
        .eq('id', fileId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "File name updated successfully",
      });
      
      setEditingFile(null);
      onRefresh();
    } catch (error) {
      console.error('Error updating file name:', error);
      toast({
        title: "Error",
        description: "Failed to update file name",
        variant: "destructive",
      });
    }
  };

  const handleCancelEdit = (fileId: string) => {
    setEditingFile(null);
    setEditName('');
  };

  const handleDownload = async (file: any) => {
    try {
      const { data, error } = await supabase.storage
        .from('project-files')
        .download(file.storage_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.original_filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download Error",
        description: "Failed to download file",
        variant: "destructive",
      });
    }
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
      onRefresh();
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
      <ContextMenuTrigger>
        <Card className="p-4 hover:shadow-md transition-shadow relative">
      <div className="absolute top-2 left-2 z-10">
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => onSelectFile(file.id, checked as boolean)}
          className="bg-white border-2"
        />
      </div>
      
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between mb-3 mt-6">
          {getFileIcon(file.file_type)}
          <Badge className={getFileTypeColor(file.file_type)}>
            {file.file_type.toUpperCase()}
          </Badge>
        </div>
        
        {isEditing ? (
          <Input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="font-semibold text-sm mb-2"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveEdit(file.id);
              if (e.key === 'Escape') handleCancelEdit(file.id);
            }}
            autoFocus
          />
        ) : (
          <h3 
            className="font-semibold text-sm mb-2 line-clamp-2 cursor-pointer hover:text-blue-600" 
            title={displayInfo.fullPath}
            onClick={() => onFileSelect(file)}
          >
            {displayInfo.pathWithinFolder || displayInfo.fileName}
          </h3>
        )}
        
        {file.description && !isEditing && (
          <p className="text-xs text-gray-600 mb-2 line-clamp-2">
            {file.description}
          </p>
        )}
        
        <div className="flex-1" />
        
        <div className="space-y-2 text-xs text-gray-500">
          <div>{formatFileSize(file.file_size)}</div>
          <div>By {file.uploaded_by_profile?.email || 'Unknown'}</div>
          <div>{format(new Date(file.uploaded_at), 'MMM dd, yyyy')}</div>
        </div>
        
        <div className="flex items-center justify-between mt-3 pt-3 border-t" onClick={(e) => e.stopPropagation()}>
          {isEditing ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSaveEdit(file.id)}
                className="text-green-600 hover:text-green-800 hover:bg-green-100"
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCancelEdit(file.id)}
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
                onClick={() => startEditingFile(file.id, displayInfo.pathWithinFolder || displayInfo.fileName)}
                className="text-blue-600 hover:text-blue-800 hover:bg-blue-100"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onFileSelect(file)}
                className="text-gray-600 hover:text-gray-800 hover:bg-gray-100"
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDownload(file)}
                className="text-gray-600 hover:text-gray-800 hover:bg-gray-100"
              >
                <Download className="h-4 w-4" />
              </Button>
              <DeleteButton
                onDelete={handleDelete}
                title="Delete File"
                description={`Are you sure you want to delete "${displayInfo.pathWithinFolder || displayInfo.fileName}"? This action cannot be undone.`}
                size="sm"
                variant="ghost"
                showIcon={true}
              />
            </>
          )}
        </div>
      </div>
    </Card>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={() => onFileSelect(file)}>
          <Eye className="h-4 w-4 mr-2" />
          View
        </ContextMenuItem>
        <ContextMenuItem onClick={() => handleDownload(file)}>
          <Download className="h-4 w-4 mr-2" />
          Download
        </ContextMenuItem>
        <ContextMenuItem onClick={() => onShare(file)}>
          <Share2 className="h-4 w-4 mr-2" />
          Create Link & Share
        </ContextMenuItem>
        <ContextMenuItem onClick={() => startEditingFile(file.id, displayInfo.pathWithinFolder || displayInfo.fileName)}>
          <Edit className="h-4 w-4 mr-2" />
          Rename
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
