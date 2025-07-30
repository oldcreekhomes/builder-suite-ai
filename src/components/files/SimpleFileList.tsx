import React, { useState } from 'react';
import { FileText, Folder, Download, Trash2, Eye, Edit3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog';
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
  const [deleteFile, setDeleteFile] = useState<SimpleFile | null>(null);
  const [renameFile, setRenameFile] = useState<SimpleFile | null>(null);
  const [newFileName, setNewFileName] = useState('');
  const [deleteFolder, setDeleteFolder] = useState<SimpleFolder | null>(null);
  const [renameFolder, setRenameFolder] = useState<SimpleFolder | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
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

  const handleFileRename = (file: SimpleFile) => {
    setRenameFile(file);
    setNewFileName(file.displayName);
  };

  const confirmRename = async () => {
    if (!renameFile || !newFileName.trim()) return;

    try {
      // Extract the directory path from the original filename
      const originalPath = renameFile.storage_path;
      const pathParts = originalPath.split('/');
      
      // Replace just the filename part, keeping the directory structure
      const directory = pathParts.slice(0, -1).join('/');
      const newOriginalFilename = directory ? `${directory}/${newFileName}` : newFileName;

      const { error } = await supabase
        .from('project_files')
        .update({ 
          original_filename: newOriginalFilename,
          filename: newFileName
        })
        .eq('id', renameFile.id);

      if (error) throw error;
      
      toast.success('File renamed successfully');
      setRenameFile(null);
      setNewFileName('');
      onRefresh();
    } catch (error) {
      console.error('Error renaming file:', error);
      toast.error('Failed to rename file');
    }
  };

  const handleFolderRename = (folder: SimpleFolder) => {
    setRenameFolder(folder);
    setNewFolderName(folder.name);
  };

  const confirmFolderRename = async () => {
    if (!renameFolder || !newFolderName.trim()) return;

    try {
      const oldFolderPath = renameFolder.path;
      const parentPath = renameFolder.path.includes('/') ? 
        renameFolder.path.substring(0, renameFolder.path.lastIndexOf('/')) : '';
      const newFolderPath = parentPath ? `${parentPath}/${newFolderName}` : newFolderName;

      // Get all files in this folder first
      const { data: filesToUpdate, error: fetchError } = await supabase
        .from('project_files')
        .select('id, original_filename')
        .like('original_filename', `${oldFolderPath}/%`)
        .eq('is_deleted', false);

      if (fetchError) throw fetchError;

      // Update each file's path individually
      if (filesToUpdate && filesToUpdate.length > 0) {
        for (const file of filesToUpdate) {
          const newFilename = file.original_filename.replace(
            new RegExp(`^${oldFolderPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/`),
            `${newFolderPath}/`
          );
          
          const { error: updateError } = await supabase
            .from('project_files')
            .update({ original_filename: newFilename })
            .eq('id', file.id);

          if (updateError) throw updateError;
        }
      }

      toast.success('Folder renamed successfully');
      setRenameFolder(null);
      setNewFolderName('');
      onRefresh();
    } catch (error) {
      console.error('Error renaming folder:', error);
      toast.error('Failed to rename folder');
    }
  };

  const handleFolderDownload = async (folder: SimpleFolder) => {
    try {
      // This would require implementing a zip functionality
      // For now, we'll show a message that this feature is coming soon
      toast.success('Folder download feature coming soon!');
    } catch (error) {
      console.error('Error downloading folder:', error);
      toast.error('Failed to download folder');
    }
  };

  const handleFolderDelete = (folder: SimpleFolder) => {
    setDeleteFolder(folder);
  };

  const confirmFolderDelete = async () => {
    if (!deleteFolder) return;

    try {
      // Mark all files in the folder as deleted
      const { error: filesError } = await supabase
        .from('project_files')
        .update({ is_deleted: true })
        .like('original_filename', `${deleteFolder.path}/%`);

      if (filesError) throw filesError;

      toast.success('Folder deleted successfully');
      setDeleteFolder(null);
      onRefresh();
    } catch (error) {
      console.error('Error deleting folder:', error);
      toast.error('Failed to delete folder');
      setDeleteFolder(null);
    }
  };

  const handleFileDelete = (file: SimpleFile) => {
    setDeleteFile(file);
  };

  const confirmDelete = async () => {
    if (!deleteFile) return;

    try {
      const { error } = await supabase
        .from('project_files')
        .update({ is_deleted: true })
        .eq('id', deleteFile.id);

      if (error) throw error;
      
      toast.success('File deleted successfully');
      setDeleteFile(null);
      onRefresh();
    } catch (error) {
      console.error('Error deleting file:', error);
      toast.error('Failed to delete file');
      setDeleteFile(null);
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
            className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent transition-colors"
          >
            <Folder className="h-5 w-5 text-blue-500" />
            <div 
              className="flex-1 cursor-pointer"
              onClick={() => onFolderClick(folder.path)}
            >
              <p className="font-medium">{folder.name}</p>
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleFolderRename(folder)}
                className="gap-1"
              >
                <Edit3 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleFolderDownload(folder)}
                className="gap-1"
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleFolderDelete(folder)}
                className="gap-1 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
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
                onClick={() => handleFileRename(file)}
                className="gap-1"
              >
                <Edit3 className="h-4 w-4" />
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

      <DeleteConfirmationDialog
        open={!!deleteFile}
        onOpenChange={(open) => !open && setDeleteFile(null)}
        onConfirm={confirmDelete}
        title="Delete File"
        description={`Are you sure you want to delete "${deleteFile?.displayName}"? This action cannot be undone.`}
      />

      <DeleteConfirmationDialog
        open={!!deleteFolder}
        onOpenChange={(open) => !open && setDeleteFolder(null)}
        onConfirm={confirmFolderDelete}
        title="Delete Folder"
        description={`Are you sure you want to delete the folder "${deleteFolder?.name}" and all its contents? This action cannot be undone.`}
      />

      <Dialog open={!!renameFile} onOpenChange={(open) => !open && setRenameFile(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename File</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label htmlFor="fileName" className="text-sm font-medium">
                File Name
              </label>
              <Input
                id="fileName"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                placeholder="Enter new file name"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameFile(null)}>
              Cancel
            </Button>
            <Button onClick={confirmRename} disabled={!newFileName.trim()}>
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!renameFolder} onOpenChange={(open) => !open && setRenameFolder(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Folder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label htmlFor="folderName" className="text-sm font-medium">
                Folder Name
              </label>
              <Input
                id="folderName"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Enter new folder name"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameFolder(null)}>
              Cancel
            </Button>
            <Button onClick={confirmFolderRename} disabled={!newFolderName.trim()}>
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};