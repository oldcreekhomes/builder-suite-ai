import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Folder, Loader2, CheckSquare, Square } from 'lucide-react';
import { useProjectFiles } from '@/hooks/useProjectFiles';
import { useProjectFolders } from '@/hooks/useProjectFolders';
import { SimpleBreadcrumb } from '@/components/files/SimpleBreadcrumb';

interface SelectProjectFilesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onSelectFiles: (storagePaths: string[]) => void;
  existingFiles?: string[];
}

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
  original_filename: string;
}

const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith('image/')) return '🖼️';
  if (mimeType.includes('pdf')) return '📄';
  if (mimeType.includes('word')) return '📝';
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
  if (mimeType.includes('zip') || mimeType.includes('rar')) return '🗜️';
  return '📁';
};

export function SelectProjectFilesModal({
  open,
  onOpenChange,
  projectId,
  onSelectFiles,
  existingFiles = [],
}: SelectProjectFilesModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPath, setCurrentPath] = useState('');
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  
  const { data: allFiles = [], isLoading: filesLoading } = useProjectFiles(projectId);
  const { data: folderRows = [], isLoading: foldersLoading } = useProjectFolders(projectId);
  
  const isLoading = filesLoading || foldersLoading;

  // Helper to normalize any path variations (same as SimpleFileManager)
  const normalizePath = (p?: string) => {
    if (!p) return '';
    return p
      .replace(/\\/g, '/') // windows to unix
      .replace(/\s+\/\s+/g, '/') // trim spaces around slashes
      .replace(/\/+/g, '/') // collapse multiple slashes
      .replace(/^\//, '') // remove leading slash
      .replace(/\/$/, '') // remove trailing slash
      .trim();
  };

  // Get files and folders for current path (same logic as SimpleFileManager)
  const getCurrentItems = useMemo(() => {
    const normalizedCurrentPath = normalizePath(currentPath);

    const folders = new Set<string>();
    const files: SimpleFile[] = [];

    // Filter out already attached files and get current path items
    allFiles.forEach(file => {
      // Skip already attached files
      if (existingFiles.includes(file.storage_path)) return;
      
      // Skip folderkeeper files
      if (file.file_type === 'folderkeeper') return;

      let filePath = normalizePath(file.original_filename);

      if (!filePath) return;

      if (normalizedCurrentPath) {
        // We're in a subfolder
        if (!(filePath + '/').startsWith(normalizedCurrentPath + '/')) return;

        const remainingPath = filePath.substring(normalizedCurrentPath.length + 1);
        const nextSlash = remainingPath.indexOf('/');

        if (nextSlash === -1) {
          // It's a file in current folder
          files.push({
            id: file.id,
            displayName: remainingPath,
            file_size: file.file_size,
            mime_type: file.mime_type,
            storage_path: file.storage_path,
            uploaded_at: file.uploaded_at,
            original_filename: file.original_filename
          });
        } else {
          // It's a direct child folder
          const folderName = remainingPath.substring(0, nextSlash);
          if (folderName) folders.add(folderName);
        }
      } else {
        // We're at root
        const firstSlash = filePath.indexOf('/');

        if (firstSlash === -1) {
          // Root level file
          files.push({
            id: file.id,
            displayName: filePath,
            file_size: file.file_size,
            mime_type: file.mime_type,
            storage_path: file.storage_path,
            uploaded_at: file.uploaded_at,
            original_filename: file.original_filename
          });
        } else {
          // Root level folder
          const folderName = filePath.substring(0, firstSlash);
          if (folderName) folders.add(folderName);
        }
      }
    });

    // Include folders from project_folders (authoritative)
    if (folderRows && folderRows.length > 0) {
      folderRows.forEach((fr: any) => {
        const frParent = normalizePath(fr.parent_path || '');
        if (!normalizedCurrentPath) {
          if (!fr.parent_path || frParent === '') {
            if (fr.folder_name) folders.add(fr.folder_name);
          }
        } else {
          if (frParent === normalizedCurrentPath) {
            if (fr.folder_name) folders.add(fr.folder_name);
          }
        }
      });
    }

    // Sort folders alphabetically (case-insensitive)
    const sortedFolders: SimpleFolder[] = Array.from(folders)
      .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
      .map(name => ({
        name,
        path: normalizedCurrentPath ? `${normalizedCurrentPath}/${name}` : name
      }));

    // Sort files alphabetically by display name (case-insensitive)
    const sortedFiles = files.sort((a, b) =>
      a.displayName.toLowerCase().localeCompare(b.displayName.toLowerCase())
    );

    return {
      folders: sortedFolders,
      files: sortedFiles
    };
  }, [allFiles, folderRows, currentPath, existingFiles]);

  // Apply search filter
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) {
      return getCurrentItems;
    }
    
    const query = searchQuery.toLowerCase();
    return {
      folders: getCurrentItems.folders.filter(folder => 
        folder.name.toLowerCase().includes(query)
      ),
      files: getCurrentItems.files.filter(file => 
        file.displayName.toLowerCase().includes(query)
      )
    };
  }, [getCurrentItems, searchQuery]);

  // Get all files in a folder (recursively)
  const getFilesInFolder = (folderPath: string): string[] => {
    const normalizedFolderPath = normalizePath(folderPath);
    return allFiles
      .filter(file => {
        if (existingFiles.includes(file.storage_path)) return false;
        if (file.file_type === 'folderkeeper') return false;
        const filePath = normalizePath(file.original_filename);
        return (filePath + '/').startsWith(normalizedFolderPath + '/') || 
               filePath.startsWith(normalizedFolderPath + '/');
      })
      .map(file => file.storage_path);
  };

  const handleFolderClick = (folderPath: string) => {
    setCurrentPath(folderPath);
  };

  const handleBreadcrumbClick = (path: string) => {
    setCurrentPath(path);
  };

  const handleToggleFile = (storagePath: string) => {
    setSelectedPaths(prev => {
      const newSet = new Set(prev);
      if (newSet.has(storagePath)) {
        newSet.delete(storagePath);
      } else {
        newSet.add(storagePath);
      }
      return newSet;
    });
  };

  const handleToggleFolder = (folderPath: string) => {
    const filesInFolder = getFilesInFolder(folderPath);
    
    setSelectedPaths(prev => {
      const newSet = new Set(prev);
      const allSelected = filesInFolder.every(path => prev.has(path));
      
      if (allSelected) {
        // Deselect all files in folder
        filesInFolder.forEach(path => newSet.delete(path));
      } else {
        // Select all files in folder
        filesInFolder.forEach(path => newSet.add(path));
      }
      return newSet;
    });
  };

  const isFolderSelected = (folderPath: string): boolean => {
    const filesInFolder = getFilesInFolder(folderPath);
    if (filesInFolder.length === 0) return false;
    return filesInFolder.every(path => selectedPaths.has(path));
  };

  const isFolderPartiallySelected = (folderPath: string): boolean => {
    const filesInFolder = getFilesInFolder(folderPath);
    if (filesInFolder.length === 0) return false;
    const selectedCount = filesInFolder.filter(path => selectedPaths.has(path)).length;
    return selectedCount > 0 && selectedCount < filesInFolder.length;
  };

  const handleSelectAll = () => {
    const allCurrentFiles = filteredItems.files.map(f => f.storage_path);
    const allFolderFiles = filteredItems.folders.flatMap(folder => getFilesInFolder(folder.path));
    const allPaths = [...allCurrentFiles, ...allFolderFiles];
    
    const allSelected = allPaths.every(path => selectedPaths.has(path));
    
    if (allSelected) {
      // Deselect all in current view
      setSelectedPaths(prev => {
        const newSet = new Set(prev);
        allPaths.forEach(path => newSet.delete(path));
        return newSet;
      });
    } else {
      // Select all in current view
      setSelectedPaths(prev => {
        const newSet = new Set(prev);
        allPaths.forEach(path => newSet.add(path));
        return newSet;
      });
    }
  };

  const isAllSelected = () => {
    const allCurrentFiles = filteredItems.files.map(f => f.storage_path);
    const allFolderFiles = filteredItems.folders.flatMap(folder => getFilesInFolder(folder.path));
    const allPaths = [...allCurrentFiles, ...allFolderFiles];
    if (allPaths.length === 0) return false;
    return allPaths.every(path => selectedPaths.has(path));
  };

  const handleAttach = () => {
    onSelectFiles(Array.from(selectedPaths));
    setSelectedPaths(new Set());
    setSearchQuery('');
    setCurrentPath('');
    onOpenChange(false);
  };

  const handleClose = () => {
    setSelectedPaths(new Set());
    setSearchQuery('');
    setCurrentPath('');
    onOpenChange(false);
  };

  const totalItems = filteredItems.folders.length + filteredItems.files.length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Select Project Files</DialogTitle>
          <DialogDescription>
            Choose files from your project to attach to this bid package.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Breadcrumb */}
          <SimpleBreadcrumb 
            currentPath={currentPath} 
            onPathClick={handleBreadcrumbClick} 
          />

          {/* Select All */}
          {totalItems > 0 && (
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelectAll}
                className="gap-2"
              >
                {isAllSelected() ? (
                  <CheckSquare className="h-4 w-4 text-primary" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
                {isAllSelected() ? 'Deselect All' : 'Select All'}
              </Button>
              {selectedPaths.size > 0 && (
                <span className="text-sm font-medium">
                  {selectedPaths.size} file(s) selected
                </span>
              )}
            </div>
          )}

          {/* File List */}
          <ScrollArea className="flex-1 border rounded-md">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : totalItems === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Folder className="h-12 w-12 mb-4" />
                <p>
                  {searchQuery 
                    ? 'No files match your search.' 
                    : currentPath
                      ? 'This folder is empty.'
                      : 'No files in this project yet.'
                  }
                </p>
              </div>
            ) : (
              <div className="p-4 space-y-2">
                {/* Folders */}
                {filteredItems.folders.map((folder) => {
                  const isSelected = isFolderSelected(folder.path);
                  const isPartial = isFolderPartiallySelected(folder.path);
                  
                  return (
                    <div
                      key={folder.path}
                      className={`flex items-center gap-1.5 p-1.5 rounded-lg border hover:bg-accent transition-colors ${
                        isSelected ? 'bg-accent border-primary' : ''
                      }`}
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleFolder(folder.path)}
                        className="p-1"
                      >
                        {isSelected ? (
                          <CheckSquare className="h-4 w-4 text-primary" />
                        ) : isPartial ? (
                          <CheckSquare className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                      </Button>
                      <Folder className="h-5 w-5 text-blue-500" />
                      <div 
                        className="flex-1 cursor-pointer"
                        onClick={() => handleFolderClick(folder.path)}
                      >
                        <p className="font-medium">{folder.name}</p>
                      </div>
                    </div>
                  );
                })}

                {/* Files */}
                {filteredItems.files.map((file) => {
                  const isSelected = selectedPaths.has(file.storage_path);

                  return (
                    <div
                      key={file.id}
                      className={`flex items-center gap-1.5 p-1.5 rounded-lg border hover:bg-accent transition-colors cursor-pointer ${
                        isSelected ? 'bg-accent border-primary' : ''
                      }`}
                      onClick={() => handleToggleFile(file.storage_path)}
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleFile(file.storage_path);
                        }}
                        className="p-1"
                      >
                        {isSelected ? (
                          <CheckSquare className="h-4 w-4 text-primary" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                      </Button>
                      <div className="text-xl">
                        {getFileIcon(file.mime_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{file.displayName}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleAttach} 
            disabled={selectedPaths.size === 0}
          >
            Attach {selectedPaths.size > 0 ? `(${selectedPaths.size})` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
