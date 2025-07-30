import React from 'react';
import { FileText, Folder, Download, Trash2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatFileSize } from './utils/simplifiedFileUtils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SimpleFolder {
  name: string;
  path: string;
}

interface SimpleFile {
  id: string;
  displayName: string;
  file_size: number;
  mime_type: string;
  storage_path: string;
  uploaded_at: string;
  uploader?: {
    first_name?: string;
    last_name?: string;
    email: string;
  };
}

interface SimpleFileListProps {
  folders: SimpleFolder[];
  files: SimpleFile[];
  onFolderClick: (path: string) => void;
  onRefresh: () => void;
}

export const SimpleFileList: React.FC<SimpleFileListProps> = ({
  folders,
  files,
  onFolderClick,
  onRefresh
}) => {
  const handleFileView = async (file: SimpleFile) => {
    try {
      const { data, error } = await supabase.storage
        .from('project-files')
        .createSignedUrl(file.storage_path, 3600);

      if (error) throw error;
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (error) {
      console.error('Error viewing file:', error);
      toast.error('Failed to open file');
    }
  };

  const handleFileDownload = async (file: SimpleFile) => {
    try {
      const { data, error } = await supabase.storage
        .from('project-files')
        .download(file.storage_path);

      if (error) throw error;
      if (data) {
        const url = URL.createObjectURL(data);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.displayName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('Failed to download file');
    }
  };

  const handleFileDelete = async (file: SimpleFile) => {
    if (!confirm(`Are you sure you want to delete "${file.displayName}"?`)) return;

    try {
      const { error } = await supabase
        .from('project_files')
        .update({ is_deleted: true })
        .eq('id', file.id);

      if (error) throw error;
      
      toast.success('File deleted successfully');
      onRefresh();
    } catch (error) {
      console.error('Error deleting file:', error);
      toast.error('Failed to delete file');
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('word')) return '📝';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
    if (mimeType.includes('zip') || mimeType.includes('rar')) return '🗜️';
    return '📁';
  };

  if (folders.length === 0 && files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <Folder className="h-12 w-12 mb-4" />
        <p>This folder is empty</p>
        <p className="text-sm">Upload files or create a new folder to get started</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="space-y-2">
        {/* Folders */}
        {folders.map((folder) => (
          <div
            key={folder.path}
            className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent cursor-pointer transition-colors"
            onClick={() => onFolderClick(folder.path)}
          >
            <Folder className="h-5 w-5 text-blue-500" />
            <div className="flex-1">
              <p className="font-medium">{folder.name}</p>
            </div>
          </div>
        ))}

        {/* Files */}
        {files.map((file) => (
          <div
            key={file.id}
            className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent transition-colors"
          >
            <div className="text-2xl">
              {getFileIcon(file.mime_type)}
            </div>
            <div className="flex-1">
              <p className="font-medium">{file.displayName}</p>
              <div className="flex gap-4 text-sm text-muted-foreground">
                <span>{formatFileSize(file.file_size)}</span>
                <span>{new Date(file.uploaded_at).toLocaleDateString()}</span>
                {file.uploader && (
                  <span>
                    by {file.uploader.first_name} {file.uploader.last_name}
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleFileView(file)}
                className="gap-1"
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleFileDownload(file)}
                className="gap-1"
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleFileDelete(file)}
                className="gap-1 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};