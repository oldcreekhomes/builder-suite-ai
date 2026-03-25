import React, { useState } from 'react';
import { FileText, Folder, Download, Trash2, Edit3, Share2, MoveRight, Lock, LockOpen, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { TableRowActions } from '@/components/ui/table-row-actions';
import { NewFolderModal } from './NewFolderModal';
import { MoveFilesModal } from './MoveFilesModal';

import { FileShareModal } from './components/FileShareModal';
import { FolderAccessModal } from './FolderAccessModal';
import { formatFileSize } from './utils/simplifiedFileUtils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useUniversalFilePreviewContext } from '@/components/files/UniversalFilePreviewProvider';
import type { FolderLock, FolderAccessGrant } from '@/hooks/useProjectFolderLocks';

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
  // Folder lock props
  lockedFolders?: FolderLock[];
  folderGrants?: FolderAccessGrant[];
  isOwner?: boolean;
  onLockFolder?: (folderPath: string) => void;
  onUnlockFolder?: (folderPath: string) => void;
}

const getFileTypeLabel = (mimeType: string): string => {
  if (mimeType.startsWith('image/')) return mimeType.split('/')[1]?.toUpperCase() || 'Image';
  if (mimeType.includes('pdf')) return 'PDF';
  if (mimeType.includes('word') || mimeType.includes('document')) return 'DOCX';
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'XLSX';
  if (mimeType.includes('zip')) return 'ZIP';
  if (mimeType.includes('text/plain')) return 'TXT';
  const parts = mimeType.split('/');
  return parts[parts.length - 1]?.toUpperCase() || '—';
};

export const SimpleFileList: React.FC<SimpleFileListProps> = ({
  folders,
  files,
  onFolderClick,
  onRefresh,
  projectId,
  currentPath,
  onCreateFolder,
  lockedFolders = [],
  folderGrants = [],
  isOwner = false,
  onLockFolder,
  onUnlockFolder,
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
  const [manageAccessFolder, setManageAccessFolder] = useState<string | null>(null);
  const { openProjectFile } = useUniversalFilePreviewContext();
  const { toast } = useToast();

  const isFolderDirectlyLocked = (folderPath: string) =>
    lockedFolders.some(l => l.folder_path === folderPath);

  const handleFileView = (file: SimpleFile) => {
    openProjectFile(file.storage_path, file.displayName);
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
      toast({ title: "Error", description: "Failed to download file", variant: "destructive" });
    }
  };

  const handleFileRename = (file: SimpleFile) => {
    setRenameFile(file);
    setNewFileName(file.displayName);
  };

  const confirmRename = async () => {
    if (!renameFile || !newFileName.trim()) return;
    try {
      let newOriginalFilename = newFileName;
      if (renameFile.original_filename && renameFile.original_filename.includes('/')) {
        const folderPath = renameFile.original_filename.substring(0, renameFile.original_filename.lastIndexOf('/'));
        newOriginalFilename = `${folderPath}/${newFileName}`;
      }
      const { error } = await supabase
        .from('project_files')
        .update({ original_filename: newOriginalFilename, filename: newFileName })
        .eq('id', renameFile.id);
      if (error) throw error;
      toast({ title: "Success", description: "File renamed successfully" });
      setRenameFile(null);
      setNewFileName('');
      onRefresh();
    } catch (error) {
      toast({ title: "Error", description: "Failed to rename file", variant: "destructive" });
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
      const parentPath = renameFolder.path.includes('/')
        ? renameFolder.path.substring(0, renameFolder.path.lastIndexOf('/'))
        : '';
      const newFolderPath = parentPath ? `${parentPath}/${newFolderName}` : newFolderName;

      const { data: filesToUpdate, error: fetchError } = await supabase
        .from('project_files')
        .select('id, original_filename')
        .eq('project_id', projectId)
        .like('original_filename', `${oldFolderPath}/%`)
        .eq('is_deleted', false);
      if (fetchError) throw fetchError;

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

      toast({ title: "Success", description: "Folder renamed successfully" });
      setRenameFolder(null);
      setNewFolderName('');
      onRefresh();
    } catch (error) {
      toast({ title: "Error", description: "Failed to rename folder", variant: "destructive" });
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

      const folderFiles = allFiles.filter(file =>
        file.original_filename.startsWith(`${folder.path}/`)
      );

      if (folderFiles.length === 0) {
        toast({ title: "Error", description: "No files found in this folder", variant: "destructive" });
        return;
      }

      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      for (const file of folderFiles) {
        try {
          const { data, error } = await supabase.storage.from('project-files').download(file.storage_path);
          if (error) continue;
          const relativePath = file.original_filename.substring(`${folder.path}/`.length);
          zip.file(relativePath, data);
        } catch {}
      }
      const content = await zip.generateAsync({ type: 'blob' });
      const url = window.URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${folder.name}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast({ title: "Success", description: `Folder "${folder.name}" downloaded successfully` });
    } catch (error) {
      toast({ title: "Error", description: "Failed to download folder", variant: "destructive" });
    }
  };

  const escapeLike = (s: string) => s.replace(/[\\%_]/g, (m) => `\\${m}`);

  const confirmFolderDelete = async () => {
    if (!deleteFolder) return;
    try {
      const escaped = escapeLike(deleteFolder.path);
      const likePrefix = `${escaped}/%`;
      const { error: filesError } = await supabase.from('project_files').update({ is_deleted: true }).eq('project_id', projectId).like('original_filename', likePrefix);
      if (filesError) throw filesError;
      const { error: keeperError } = await supabase.from('project_files').update({ is_deleted: true }).eq('project_id', projectId).eq('original_filename', `${deleteFolder.path}/.folderkeeper`);
      if (keeperError) throw keeperError;
      await supabase.storage.from('project-files').remove([`${projectId}/${deleteFolder.path}/.folderkeeper`]);
      const { error: pfError1 } = await supabase.from('project_folders').delete().match({ project_id: projectId, folder_path: deleteFolder.path });
      if (pfError1) throw pfError1;
      const { error: pfError2 } = await supabase.from('project_folders').delete().eq('project_id', projectId).like('folder_path', likePrefix);
      if (pfError2) throw pfError2;
      toast({ title: "Success", description: "Folder deleted successfully" });
      setDeleteFolder(null);
      onRefresh();
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete folder", variant: "destructive" });
      setDeleteFolder(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteFile) return;
    try {
      const { error } = await supabase.from('project_files').update({ is_deleted: true }).eq('id', deleteFile.id);
      if (error) throw error;
      toast({ title: "Success", description: "File deleted successfully" });
      setDeleteFile(null);
      onRefresh();
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete file", variant: "destructive" });
      setDeleteFile(null);
    }
  };

  const handleSelectFile = (fileId: string, checked: boolean) => {
    const newSelected = new Set(selectedFiles);
    checked ? newSelected.add(fileId) : newSelected.delete(fileId);
    setSelectedFiles(newSelected);
  };

  const handleSelectFolder = (folderPath: string, checked: boolean) => {
    const newSelected = new Set(selectedFolders);
    checked ? newSelected.add(folderPath) : newSelected.delete(folderPath);
    setSelectedFolders(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedFiles(new Set(files.map(f => f.id)));
      setSelectedFolders(new Set(folders.map(f => f.path)));
    } else {
      setSelectedFiles(new Set());
      setSelectedFolders(new Set());
    }
  };

  const handleMoveFiles = (fileIds?: string[], folderPaths?: string[]) => {
    if (fileIds || folderPaths) {
      setFilesToMove(fileIds || []);
      setFoldersToMove(folderPaths || []);
    } else {
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
      if (selectedFiles.size > 0) {
        const fileIds = Array.from(selectedFiles);
        const { error } = await supabase.from('project_files').update({ is_deleted: true }).in('id', fileIds);
        if (error) throw error;
        deletedCount += selectedFiles.size;
      }
      if (selectedFolders.size > 0) {
        for (const folderPath of selectedFolders) {
          const escaped = escapeLike(folderPath);
          const likePrefix = `${escaped}/%`;
          const { error: filesError } = await supabase.from('project_files').update({ is_deleted: true }).eq('project_id', projectId).like('original_filename', likePrefix);
          if (filesError) throw filesError;
          const { error: keeperError } = await supabase.from('project_files').update({ is_deleted: true }).eq('project_id', projectId).eq('original_filename', `${folderPath}/.folderkeeper`);
          if (keeperError) throw keeperError;
          await supabase.storage.from('project-files').remove([`${projectId}/${folderPath}/.folderkeeper`]);
          const { error: pfError1 } = await supabase.from('project_folders').delete().match({ project_id: projectId, folder_path: folderPath });
          if (pfError1) throw pfError1;
          const { error: pfError2 } = await supabase.from('project_folders').delete().eq('project_id', projectId).like('folder_path', likePrefix);
          if (pfError2) throw pfError2;
          deletedCount += 1;
        }
      }
      const itemType = selectedFiles.size > 0 && selectedFolders.size > 0 ? 'item(s)' : selectedFiles.size > 0 ? 'file(s)' : 'folder(s)';
      toast({ title: "Success", description: `Successfully deleted ${deletedCount} ${itemType}` });
      setSelectedFiles(new Set());
      setSelectedFolders(new Set());
      setShowBulkDeleteConfirm(false);
      onRefresh();
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete selected items", variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

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

  const allSelected = files.length + folders.length > 0
    && selectedFiles.size === files.length
    && selectedFolders.size === folders.length;

  const someSelected = selectedFiles.size > 0 || selectedFolders.size > 0;

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
    <div>
      {/* Inline bulk action bar — only shown when items are selected */}
      {someSelected && (
        <div className="flex items-center gap-3 mb-2 px-1">
          <span className="text-sm text-muted-foreground">
            {selectedFiles.size + selectedFolders.size} selected
          </span>
          <Button variant="outline" size="sm" onClick={() => handleMoveFiles()} className="gap-2">
            <MoveRight className="h-4 w-4" />
            Move Selected
          </Button>
          <Button variant="destructive" size="sm" onClick={handleBulkDelete} disabled={isDeleting} className="gap-2">
            <Trash2 className="h-4 w-4" />
            {isDeleting ? "Deleting..." : "Delete Selected"}
          </Button>
        </div>
      )}

      <Table containerClassName="relative w-full">
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <Checkbox
                checked={allSelected}
                onCheckedChange={(checked) => handleSelectAll(!!checked)}
                aria-label="Select all"
              />
            </TableHead>
            <TableHead>Name</TableHead>
            <TableHead className="w-24">Type</TableHead>
            <TableHead className="w-28">Size</TableHead>
            <TableHead className="w-40">Uploaded By</TableHead>
            <TableHead className="w-32">Date</TableHead>
            <TableHead className="w-20 text-center">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {/* Folders */}
          {folders.map((folder) => (
            <TableRow key={folder.path} data-state={selectedFolders.has(folder.path) ? 'selected' : undefined}>
              <TableCell>
                <Checkbox
                  checked={selectedFolders.has(folder.path)}
                  onCheckedChange={(checked) => handleSelectFolder(folder.path, !!checked)}
                  aria-label={`Select folder ${folder.name}`}
                />
              </TableCell>
              <TableCell>
                <button
                  className="flex items-center gap-2 text-left focus:outline-none"
                  onClick={() => onFolderClick(folder.path)}
                >
                  <Folder className="h-4 w-4 text-primary shrink-0" />
                  <span className="font-medium">{folder.name}</span>
                  {isFolderDirectlyLocked(folder.path) && (
                    <Lock className="h-3.5 w-3.5 text-red-600 shrink-0" />
                  )}
                </button>
              </TableCell>
              <TableCell className="text-muted-foreground">—</TableCell>
              <TableCell className="text-muted-foreground">—</TableCell>
              <TableCell className="text-muted-foreground">—</TableCell>
              <TableCell className="text-muted-foreground">—</TableCell>
              <TableCell className="text-center">
                <TableRowActions actions={[
                  { label: 'Rename', onClick: () => handleFolderRename(folder) },
                  { label: 'Download as Zip', onClick: () => handleFolderDownload(folder) },
                  { label: 'Move', onClick: () => handleMoveFiles([], [folder.path]) },
                  ...(isOwner ? [
                    isFolderDirectlyLocked(folder.path)
                      ? { label: 'Unlock Folder', onClick: () => onUnlockFolder?.(folder.path) }
                      : { label: 'Lock Folder', onClick: () => onLockFolder?.(folder.path) },
                    ...(isFolderDirectlyLocked(folder.path)
                      ? [{ label: 'Manage Access', onClick: () => setManageAccessFolder(folder.path) }]
                      : []),
                  ] : []),
                  {
                    label: 'Delete',
                    onClick: () => setDeleteFolder(folder),
                    variant: 'destructive' as const,
                  },
                ]} />
              </TableCell>
            </TableRow>
          ))}

          {/* Files */}
          {files.map((file) => (
            <TableRow key={file.id} data-state={selectedFiles.has(file.id) ? 'selected' : undefined}>
              <TableCell>
                <Checkbox
                  checked={selectedFiles.has(file.id)}
                  onCheckedChange={(checked) => handleSelectFile(file.id, !!checked)}
                  aria-label={`Select file ${file.displayName}`}
                />
              </TableCell>
              <TableCell>
                <button
                  className="flex items-center gap-2 text-left focus:outline-none truncate max-w-xs"
                  onClick={() => handleFileView(file)}
                >
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="truncate">{file.displayName}</span>
                </button>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {getFileTypeLabel(file.mime_type)}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatFileSize(file.file_size)}
              </TableCell>
              <TableCell className="text-muted-foreground truncate max-w-[160px]">
                {file.uploader
                  ? (file.uploader.first_name || file.uploader.last_name
                    ? `${file.uploader.first_name ?? ''} ${file.uploader.last_name ?? ''}`.trim()
                    : file.uploader.email)
                  : '—'}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {new Date(file.uploaded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </TableCell>
              <TableCell className="text-center">
                <TableRowActions actions={[
                  { label: 'Preview', onClick: () => handleFileView(file) },
                  { label: 'Download', onClick: () => handleFileDownload(file) },
                  { label: 'Rename', onClick: () => handleFileRename(file) },
                  { label: 'Share', onClick: () => setShareFile(file) },
                  { label: 'Move', onClick: () => handleMoveFiles([file.id], []) },
                  {
                    label: 'Delete',
                    onClick: () => setDeleteFile(file),
                    variant: 'destructive' as const,
                  },
                ]} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Dialogs */}
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
              <label htmlFor="fileName" className="text-sm font-medium">File Name</label>
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
            <Button variant="outline" onClick={() => setRenameFile(null)}>Cancel</Button>
            <Button onClick={confirmRename} disabled={!newFileName.trim()}>Rename</Button>
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
              <label htmlFor="folderName" className="text-sm font-medium">Folder Name</label>
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
            <Button variant="outline" onClick={() => setRenameFolder(null)}>Cancel</Button>
            <Button onClick={confirmFolderRename} disabled={!newFolderName.trim()}>Rename</Button>
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
