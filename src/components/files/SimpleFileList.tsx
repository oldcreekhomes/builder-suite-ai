import React, { useState } from 'react';
import { FileText, Folder, Download, Trash2, Eye, Edit3, FolderPlus, CheckSquare, Square, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog';
import { NewFolderModal } from './NewFolderModal';
import { MoveFilesModal } from './MoveFilesModal';
import { BulkActionBar } from './components/BulkActionBar';
import { FileShareModal } from './components/FileShareModal';
import { formatFileSize } from './utils/simplifiedFileUtils';
import { supabase } from '@/integrations/supabase/client';
import { useUniversalFilePreviewContext } from './UniversalFilePreviewProvider';
import { toast } from 'sonner';
import { openFileViaRedirect } from '@/utils/fileOpenUtils';
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
  original_filename?: string;
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
  projectId: string;
  currentPath: string;
  onCreateFolder: (folderName: string) => void;
}

export const SimpleFileList: React.FC<SimpleFileListProps> = ({
  folders,
  files,
  onFolderClick,
  onRefresh,
  projectId,
  currentPath,
  onCreateFolder
}) => {
  const [deleteFile, setDeleteFile] = useState<SimpleFile | null>(null);
  const [renameFile, setRenameFile] = useState<SimpleFile | null>(null);
  const [newFileName, setNewFileName] = useState('');
  const [deleteFolder, setDeleteFolder] = useState<SimpleFolder | null>(null);
  const [renameFolder, setRenameFolder] = useState<SimpleFolder | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [selectedFolders, setSelectedFolders] = useState<Set<string>>(new Set());
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [filesToMove, setFilesToMove] = useState<string[]>([]);
  const [foldersToMove, setFoldersToMove] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [shareFile, setShareFile] = useState<SimpleFile | null>(null);
  const { openProjectFile } = useUniversalFilePreviewContext();

  const handleFileView = (file: SimpleFile) => {
    console.log('PROJECT FILES: Opening file', file.storage_path, file.displayName);
    openProjectFile(file.storage_path, file.displayName, {
      id: file.id,
      size: file.file_size,
      mimeType: file.mime_type,
      uploadedAt: file.uploaded_at,
      uploadedBy: file.uploader?.email
    });
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
      // Simple rename: just update the filename, preserve any existing folder structure
      let newOriginalFilename = newFileName;
      
      // If the file is in a folder, preserve the folder path
      if (renameFile.original_filename && renameFile.original_filename.includes('/')) {
        const folderPath = renameFile.original_filename.substring(0, renameFile.original_filename.lastIndexOf('/'));
        newOriginalFilename = `${folderPath}/${newFileName}`;
      }

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
      const { data: allFiles = [], error: fetchError } = await supabase
        .from('project_files')
        .select('*')
        .eq('project_id', projectId)
        .neq('file_type', 'folderkeeper')
        .eq('is_deleted', false);

      if (fetchError) throw fetchError;

      // Filter files that belong to this folder
      const folderFiles = allFiles.filter(file => {
        const filePath = file.original_filename;
        const expectedPrefix = `${folder.path}/`;
        return filePath.startsWith(expectedPrefix);
      });

      if (folderFiles.length === 0) {
        toast.error('No files found in this folder');
        return;
      }

      // Import JSZip dynamically
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      // Download each file and add to zip
      for (const file of folderFiles) {
        try {
          const { data, error } = await supabase.storage
            .from('project-files')
            .download(file.storage_path);

          if (error) {
            console.error(`Error downloading ${file.filename}:`, error);
            continue;
          }

          // Get the relative path within the folder for the zip
          const expectedPrefix = `${folder.path}/`;
          const relativePath = file.original_filename.substring(expectedPrefix.length);
          
          zip.file(relativePath, data);
        } catch (error) {
          console.error(`Error processing ${file.filename}:`, error);
        }
      }

      // Generate and download the zip file
      const content = await zip.generateAsync({ type: 'blob' });
      const url = window.URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${folder.name}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success(`Folder "${folder.name}" downloaded successfully`);
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

  const handleFileShare = (file: SimpleFile) => {
    setShareFile(file);
  };

  // Convert SimpleFile to ProjectFile format for the share modal
  const getShareableFile = (file: SimpleFile | null) => {
    if (!file) return null;
    
    return {
      id: file.id,
      project_id: projectId,
      original_filename: file.original_filename || file.displayName,
      file_size: file.file_size,
      file_type: file.mime_type,
      storage_path: file.storage_path,
      uploaded_by: file.uploader?.email || 'unknown',
      uploaded_at: file.uploaded_at,
      uploaded_by_profile: file.uploader ? { email: file.uploader.email } : undefined
    };
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

  const handleSelectFile = (fileId: string, checked: boolean) => {
    const newSelected = new Set(selectedFiles);
    if (checked) {
      newSelected.add(fileId);
    } else {
      newSelected.delete(fileId);
    }
    setSelectedFiles(newSelected);
  };

  const handleSelectFolder = (folderPath: string, checked: boolean) => {
    const newSelected = new Set(selectedFolders);
    if (checked) {
      newSelected.add(folderPath);
    } else {
      newSelected.delete(folderPath);
    }
    setSelectedFolders(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedFiles(new Set(files.map(file => file.id)));
      setSelectedFolders(new Set(folders.map(folder => folder.path)));
    } else {
      setSelectedFiles(new Set());
      setSelectedFolders(new Set());
    }
  };

  const handleMoveFiles = (fileIds?: string[], folderPaths?: string[]) => {
    if (fileIds || folderPaths) {
      // Individual item move - set specific items to move
      setFilesToMove(fileIds || []);
      setFoldersToMove(folderPaths || []);
    } else {
      // Bulk move - use current selection
      setFilesToMove(Array.from(selectedFiles));
      setFoldersToMove(Array.from(selectedFolders));
    }
    setShowMoveModal(true);
  };

  const handleMoveSuccess = () => {
    setSelectedFiles(new Set());
    setSelectedFolders(new Set());
    onRefresh();
  };

  const handleBulkDelete = () => {
    if (selectedFiles.size > 0 || selectedFolders.size > 0) {
      setShowBulkDeleteConfirm(true);
    }
  };

  const confirmBulkDelete = async () => {
    if (selectedFiles.size === 0 && selectedFolders.size === 0) return;

    setIsDeleting(true);
    try {
      let deletedCount = 0;
      
      // Delete selected files
      if (selectedFiles.size > 0) {
        const fileIds = Array.from(selectedFiles);
        const { error } = await supabase
          .from('project_files')
          .update({ is_deleted: true })
          .in('id', fileIds);

        if (error) throw error;
        deletedCount += selectedFiles.size;
      }

      // Delete selected folders and their contents
      if (selectedFolders.size > 0) {
        for (const folderPath of selectedFolders) {
          const { error } = await supabase
            .from('project_files')
            .update({ is_deleted: true })
            .like('original_filename', `${folderPath}/%`);

          if (error) throw error;
          deletedCount += 1; // Count folder as 1 item for user feedback
        }
      }

      const itemType = selectedFiles.size > 0 && selectedFolders.size > 0 
        ? 'item(s)' 
        : selectedFiles.size > 0 
          ? 'file(s)' 
          : 'folder(s)';
      
      toast.success(`Successfully deleted ${deletedCount} ${itemType}`);
      setSelectedFiles(new Set());
      setSelectedFolders(new Set());
      setShowBulkDeleteConfirm(false);
      onRefresh();
    } catch (error) {
      console.error('Error deleting items:', error);
      toast.error('Failed to delete selected items');
    } finally {
      setIsDeleting(false);
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
      {/* Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedFiles.size}
        selectedFolderCount={selectedFolders.size}
        onBulkDelete={handleBulkDelete}
        isDeleting={isDeleting}
      />

      {/* Select All Controls */}
      {(files.length > 0 || folders.length > 0) && (
        <div className="mb-4 flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const allSelected = selectedFiles.size === files.length && selectedFolders.size === folders.length;
              handleSelectAll(!allSelected);
            }}
            className="gap-2"
          >
            {selectedFiles.size === files.length && selectedFolders.size === folders.length ? (
              <CheckSquare className="h-4 w-4" />
            ) : (
              <Square className="h-4 w-4" />
            )}
            {selectedFiles.size === files.length && selectedFolders.size === folders.length ? 'Deselect All' : 'Select All'}
          </Button>
          {(selectedFiles.size > 0 || selectedFolders.size > 0) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleMoveFiles()}
              className="gap-2"
            >
               <FileText className="h-4 w-4" />
              Move Selected ({selectedFiles.size + selectedFolders.size})
            </Button>
          )}
        </div>
      )}
      
      <div className="space-y-2">
        {/* Folders */}
        {folders.map((folder) => (
          <div
            key={folder.path}
            className={`flex items-center gap-1.5 p-1.5 rounded-lg border hover:bg-accent transition-colors ${
              selectedFolders.has(folder.path) ? 'bg-accent border-primary' : ''
            }`}
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleSelectFolder(folder.path, !selectedFolders.has(folder.path))}
              className="p-1"
            >
              {selectedFolders.has(folder.path) ? (
                <CheckSquare className="h-4 w-4 text-primary" />
              ) : (
                <Square className="h-4 w-4" />
              )}
            </Button>
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
                onClick={() => handleMoveFiles([], [folder.path])}
                className="gap-1"
                title="Move folder"
              >
                <FileText className="h-4 w-4" />
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
            className={`flex items-center gap-1.5 p-1.5 rounded-lg border hover:bg-accent transition-colors ${
              selectedFiles.has(file.id) ? 'bg-accent border-primary' : ''
            }`}
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleSelectFile(file.id, !selectedFiles.has(file.id))}
              className="p-1"
            >
              {selectedFiles.has(file.id) ? (
                <CheckSquare className="h-4 w-4 text-primary" />
              ) : (
                <Square className="h-4 w-4" />
              )}
            </Button>
            <div className="text-xl">
              {getFileIcon(file.mime_type)}
            </div>
            <div 
              className="flex-1 min-w-0 cursor-pointer"
              title="Ctrl/Cmd-click or Middle-click to open in new tab"
              onMouseDown={(e) => {
                if (e.button === 1 || e.metaKey || e.ctrlKey) {
                  e.stopPropagation();
                  e.preventDefault();
                  openFileViaRedirect('project-files', file.storage_path, file.displayName);
                }
              }}
            >
              <p className="font-medium truncate">{file.displayName}</p>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground whitespace-nowrap">
              <span>{formatFileSize(file.file_size)}</span>
              <span>{new Date(file.uploaded_at).toLocaleDateString()}</span>
              {file.uploader && (
                <span className="hidden sm:inline">
                  {file.uploader.first_name} {file.uploader.last_name}
                </span>
              )}
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleFileShare(file)}
                className="gap-1"
              >
                <Share2 className="h-4 w-4" />
              </Button>
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

      <NewFolderModal
        isOpen={showNewFolderModal}
        onClose={() => setShowNewFolderModal(false)}
        onCreateFolder={onCreateFolder}
        parentPath={currentPath}
      />

      <MoveFilesModal
        isOpen={showMoveModal}
        onClose={() => setShowMoveModal(false)}
        selectedFileIds={filesToMove}
        selectedFolderPaths={foldersToMove}
        files={files}
        folders={folders}
        onSuccess={handleMoveSuccess}
        projectId={projectId}
      />

      <DeleteConfirmationDialog
        open={showBulkDeleteConfirm}
        onOpenChange={(open) => !open && setShowBulkDeleteConfirm(false)}
        onConfirm={confirmBulkDelete}
        title="Delete Selected Items"
        description={`Are you sure you want to delete ${selectedFiles.size + selectedFolders.size} selected item(s)? This action cannot be undone.`}
      />

      <FileShareModal
        isOpen={!!shareFile}
        onClose={() => setShareFile(null)}
        file={getShareableFile(shareFile)}
      />
    </div>
  );
};