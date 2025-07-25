
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FileText, Trash2 } from "lucide-react";
import { getDisplayName } from "./utils/fileGridUtils";
import { groupFilesByFolder, sortFolders } from "./utils/fileUtils";
import { useFileGridOperations } from "./hooks/useFileGridOperations";
import { useFileGridDragDrop } from "./hooks/useFileGridDragDrop";
import { useFileDragDrop } from "./hooks/useFileDragDrop";
import { FileGridFolder } from "./components/FileGridFolder";
import { FileGridCard } from "./components/FileGridCard";

interface FileGridProps {
  files: any[];
  onFileSelect: (file: any) => void;
  onRefresh: () => void;
  onShare: (file: any) => void;
  onShareFolder: (folderPath: string, files: any[]) => void;
  onCreateSubfolder: (parentPath: string) => void;
}

export function FileGrid({ files, onFileSelect, onRefresh, onShare, onShareFolder, onCreateSubfolder }: FileGridProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const {
    selectedFiles,
    isDeleting,
    uploadFileToFolder,
    moveFileToFolder,
    handleSelectAll,
    handleSelectFile,
    handleBulkDelete,
  } = useFileGridOperations(onRefresh);

  const {
    dragOverFolder: uploadDragOverFolder,
    draggedFileCount,
    handleFolderDragOver: handleUploadDragOver,
    handleFolderDragLeave: handleUploadDragLeave,
    handleFolderDrop: handleUploadDrop,
  } = useFileGridDragDrop({ uploadFileToFolder, onRefresh });

  const {
    isDragging,
    draggedFiles,
    dragOverFolder: moveDragOverFolder,
    getFileDragProps,
    getFolderDropProps,
  } = useFileDragDrop({ moveFileToFolder, onRefresh, selectedFiles });

  // Group files by folder
  const groupedFiles = groupFilesByFolder(files);
  const folderPaths = Object.keys(groupedFiles);
  const sortedFolders = sortFolders(folderPaths);

  // Filter folders to only show top-level and expanded folders
  const getVisibleFolders = () => {
    return sortedFolders.filter(folderPath => {
      if (folderPath === '__LOOSE_FILES__') return true;
      
      const pathParts = folderPath.split('/');
      
      // Always show top-level folders
      if (pathParts.length === 1) return true;
      
      // For nested folders, check if all parent folders are expanded
      for (let i = 1; i < pathParts.length; i++) {
        const parentPath = pathParts.slice(0, i).join('/');
        if (!expandedFolders.has(parentPath)) {
          return false;
        }
      }
      
      return true;
    });
  };

  const visibleFolders = getVisibleFolders();

  const toggleFolder = (folderPath: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderPath)) {
      newExpanded.delete(folderPath);
    } else {
      newExpanded.add(folderPath);
    }
    setExpandedFolders(newExpanded);
  };

  if (files.length === 0) {
    return (
      <Card className="p-8 text-center">
        <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No files found</h3>
        <p className="text-gray-600">Upload files to get started</p>
      </Card>
    );
  }

  const allSelected = files.length > 0 && selectedFiles.size === files.length;
  const someSelected = selectedFiles.size > 0 && selectedFiles.size < files.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Checkbox
            checked={allSelected}
            ref={(el) => {
              if (el) {
                const checkbox = el.querySelector('input[type="checkbox"]') as HTMLInputElement;
                if (checkbox) {
                  checkbox.indeterminate = someSelected;
                }
              }
            }}
            onCheckedChange={(checked) => handleSelectAll(checked as boolean, files)}
          />
          <span className="text-sm text-gray-600">Select All</span>
        </div>

        {selectedFiles.size > 0 && (
          <div className="flex items-center space-x-3 bg-blue-50 p-2 rounded-lg">
            <span className="text-sm text-blue-800">
              {selectedFiles.size} file(s) selected
            </span>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBulkDelete}
              disabled={isDeleting}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Selected
            </Button>
          </div>
        )}
      </div>

      {visibleFolders.map((folderPath) => {
        const folderFiles = groupedFiles[folderPath];
        
        // Handle loose files differently - render them directly without folder header
        if (folderPath === '__LOOSE_FILES__') {
          return (
            <div key={folderPath} className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {folderFiles.map((file) => (
                  <div key={file.id} {...getFileDragProps(file.id)}>
                    <FileGridCard
                      file={file}
                      isSelected={selectedFiles.has(file.id)}
                      onSelectFile={handleSelectFile}
                      onFileSelect={onFileSelect}
                      onRefresh={onRefresh}
                      onShare={onShare}
                      isDragging={isDragging && draggedFiles.includes(file.id)}
                    />
                  </div>
                ))}
              </div>
            </div>
          );
        }
        
        // Handle regular folders
        const isExpanded = expandedFolders.has(folderPath);
        const isUploadDragOver = uploadDragOverFolder === folderPath;
        const isMoveDragOver = moveDragOverFolder === folderPath;
        const isDragOver = isUploadDragOver || isMoveDragOver;
        
        return (
          <div key={folderPath} className="space-y-3">
            <div
              onDragOver={(e) => {
                // Detect if this is external files (from desktop) or internal files (app files being moved)
                const isExternalFiles = !e.dataTransfer.types.includes('application/x-internal-file-move');
                
                if (isExternalFiles) {
                  // External files - handle upload
                  handleUploadDragOver(e, folderPath);
                } else {
                  // Internal files - handle move
                  getFolderDropProps(folderPath).onDragOver(e);
                }
              }}
              onDragLeave={(e) => {
                const isExternalFiles = !e.dataTransfer.types.includes('application/x-internal-file-move');
                
                if (isExternalFiles) {
                  handleUploadDragLeave(e);
                } else {
                  getFolderDropProps(folderPath).onDragLeave(e);
                }
              }}
              onDrop={(e) => {
                const isExternalFiles = !e.dataTransfer.types.includes('application/x-internal-file-move');
                
                if (isExternalFiles) {
                  // External files - upload to folder
                  handleUploadDrop(e, folderPath);
                } else {
                  // Internal files - move to folder
                  getFolderDropProps(folderPath).onDrop(e);
                }
              }}
            >
              <FileGridFolder
                folderPath={folderPath}
                folderFiles={folderFiles}
                isExpanded={isExpanded}
                isDragOver={isDragOver}
                draggedFileCount={draggedFileCount}
                onToggleFolder={toggleFolder}
                onDragOver={() => {}}
                onDragLeave={() => {}}
                onDrop={() => {}}
                onShareFolder={onShareFolder}
                onCreateSubfolder={onCreateSubfolder}
                onRefresh={onRefresh}
              />
            </div>

            {isExpanded && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 ml-8">
                {folderFiles.map((file) => (
                  <div key={file.id} {...getFileDragProps(file.id)}>
                    <FileGridCard
                      file={file}
                      isSelected={selectedFiles.has(file.id)}
                      onSelectFile={handleSelectFile}
                      onFileSelect={onFileSelect}
                      onRefresh={onRefresh}
                      onShare={onShare}
                      isDragging={isDragging && draggedFiles.includes(file.id)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
