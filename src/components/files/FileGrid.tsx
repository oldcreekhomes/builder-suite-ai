
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FileText, Trash2 } from "lucide-react";
import { getDisplayName } from "./utils/fileGridUtils";
import { useFileGridOperations } from "./hooks/useFileGridOperations";
import { useFileGridDragDrop } from "./hooks/useFileGridDragDrop";
import { FileGridFolder } from "./components/FileGridFolder";
import { FileGridCard } from "./components/FileGridCard";

interface FileGridProps {
  files: any[];
  onFileSelect: (file: any) => void;
  onRefresh: () => void;
  onUploadToFolder?: (folderName: string, files: File[]) => void;
  onShare: (file: any) => void;
  onShareFolder: (folderPath: string, files: any[]) => void;
}

export function FileGrid({ files, onFileSelect, onRefresh, onUploadToFolder, onShare, onShareFolder }: FileGridProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const {
    selectedFiles,
    isDeleting,
    uploadFileToFolder,
    handleSelectAll,
    handleSelectFile,
    handleBulkDelete,
  } = useFileGridOperations(onRefresh);

  const {
    dragOverFolder,
    handleFolderDragOver,
    handleFolderDragLeave,
    handleFolderDrop,
  } = useFileGridDragDrop({ uploadFileToFolder, onRefresh });

  // Group files by folder using the same logic as FileList
  const groupedFiles = files.reduce((acc, file) => {
    // Skip folder placeholder files
    if (file.file_type === 'folderkeeper') {
      return acc;
    }
    
    const filePath = file.original_filename || file.filename || '';
    
    // Check if this is a loose file
    if (filePath.startsWith('__LOOSE_FILE__')) {
      if (!acc['__LOOSE_FILES__']) {
        acc['__LOOSE_FILES__'] = [];
      }
      acc['__LOOSE_FILES__'].push(file);
      return acc;
    }
    
    // Extract folder path
    const pathParts = filePath.split('/');
    
    if (pathParts.length === 1) {
      // Root level file - treat as loose file
      if (!acc['__LOOSE_FILES__']) {
        acc['__LOOSE_FILES__'] = [];
      }
      acc['__LOOSE_FILES__'].push(file);
    } else {
      // File in folder - use complete folder path except filename
      const folderPath = pathParts.slice(0, -1).join('/');
      if (!acc[folderPath]) {
        acc[folderPath] = [];
      }
      acc[folderPath].push(file);
    }
    
    return acc;
  }, {} as Record<string, any[]>);

  // Sort folders - loose files last, then alphabetically
  const sortedFolders = Object.keys(groupedFiles).sort((a, b) => {
    if (a === '__LOOSE_FILES__') return 1;
    if (b === '__LOOSE_FILES__') return -1;
    return a.localeCompare(b);
  });

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

      {sortedFolders.map((folderPath) => {
        const folderFiles = groupedFiles[folderPath];
        
        // Handle loose files differently - render them directly without folder header
        if (folderPath === '__LOOSE_FILES__') {
          return (
            <div key={folderPath} className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {folderFiles.map((file) => (
                  <FileGridCard
                    key={file.id}
                    file={file}
                    isSelected={selectedFiles.has(file.id)}
                    onSelectFile={handleSelectFile}
                    onFileSelect={onFileSelect}
                    onRefresh={onRefresh}
                    onShare={onShare}
                  />
                ))}
              </div>
            </div>
          );
        }
        
        // Handle regular folders
        const isExpanded = expandedFolders.has(folderPath);
        const isDragOver = dragOverFolder === folderPath;
        
        return (
          <div key={folderPath} className="space-y-3">
            <FileGridFolder
              folderPath={folderPath}
              folderFiles={folderFiles}
              isExpanded={isExpanded}
              isDragOver={isDragOver}
              onToggleFolder={toggleFolder}
              onDragOver={handleFolderDragOver}
              onDragLeave={handleFolderDragLeave}
              onDrop={handleFolderDrop}
              onShareFolder={onShareFolder}
            />

            {isExpanded && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 ml-8">
                {folderFiles.map((file) => (
                  <FileGridCard
                    key={file.id}
                    file={file}
                    isSelected={selectedFiles.has(file.id)}
                    onSelectFile={handleSelectFile}
                    onFileSelect={onFileSelect}
                    onRefresh={onRefresh}
                    onShare={onShare}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
