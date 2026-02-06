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
import { Checkbox } from '@/components/ui/checkbox';
import { Search, FileText, FileSpreadsheet, File, Loader2 } from 'lucide-react';
import { useProjectFiles } from '@/hooks/useProjectFiles';
import { formatDistanceToNow } from 'date-fns';

interface SelectProjectFilesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onSelectFiles: (storagePaths: string[]) => void;
  existingFiles?: string[];
}

const getFileIcon = (fileName: string) => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'xlsx':
    case 'xls':
      return FileSpreadsheet;
    case 'pdf':
      return File;
    default:
      return FileText;
  }
};

const getFileIconColor = (fileName: string) => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'pdf':
      return 'text-red-600';
    case 'xlsx':
    case 'xls':
      return 'text-green-600';
    case 'docx':
    case 'doc':
      return 'text-blue-600';
    default:
      return 'text-muted-foreground';
  }
};

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

export function SelectProjectFilesModal({
  open,
  onOpenChange,
  projectId,
  onSelectFiles,
  existingFiles = [],
}: SelectProjectFilesModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  
  const { data: projectFiles, isLoading } = useProjectFiles(projectId);

  // Filter files based on search and exclude already attached files
  const filteredFiles = useMemo(() => {
    if (!projectFiles) return [];
    
    return projectFiles.filter(file => {
      // Exclude already attached files
      if (existingFiles.includes(file.storage_path)) return false;
      
      // Apply search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return (
          file.original_filename.toLowerCase().includes(query) ||
          file.filename.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [projectFiles, searchQuery, existingFiles]);

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

  const handleSelectAll = () => {
    if (selectedPaths.size === filteredFiles.length) {
      setSelectedPaths(new Set());
    } else {
      setSelectedPaths(new Set(filteredFiles.map(f => f.storage_path)));
    }
  };

  const handleAttach = () => {
    onSelectFiles(Array.from(selectedPaths));
    setSelectedPaths(new Set());
    setSearchQuery('');
    onOpenChange(false);
  };

  const handleClose = () => {
    setSelectedPaths(new Set());
    setSearchQuery('');
    onOpenChange(false);
  };

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

          {/* Select All */}
          {filteredFiles.length > 0 && (
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedPaths.size === filteredFiles.length && filteredFiles.length > 0}
                  onCheckedChange={handleSelectAll}
                />
                <span className="text-sm text-muted-foreground">
                  Select all ({filteredFiles.length} files)
                </span>
              </div>
              {selectedPaths.size > 0 && (
                <span className="text-sm font-medium">
                  {selectedPaths.size} selected
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
            ) : filteredFiles.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery 
                  ? 'No files match your search.' 
                  : projectFiles?.length === 0 
                    ? 'No files in this project yet.'
                    : 'All project files are already attached.'
                }
              </div>
            ) : (
              <div className="divide-y">
                {filteredFiles.map((file) => {
                  const IconComponent = getFileIcon(file.original_filename);
                  const iconColor = getFileIconColor(file.original_filename);
                  const isSelected = selectedPaths.has(file.storage_path);

                  return (
                    <div
                      key={file.id}
                      className={`flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer ${
                        isSelected ? 'bg-primary/5' : ''
                      }`}
                      onClick={() => handleToggleFile(file.storage_path)}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleToggleFile(file.storage_path)}
                      />
                      <IconComponent className={`h-5 w-5 flex-shrink-0 ${iconColor}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {file.original_filename}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(file.file_size)} • Uploaded {formatDistanceToNow(new Date(file.uploaded_at), { addSuffix: true })}
                        </p>
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
