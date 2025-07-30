import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2 } from "lucide-react";
import { FileGridCard } from './components/FileGridCard';
import { FileGridFolder } from './components/FileGridFolder';
import { useFileGridOperations } from './hooks/useFileGridOperations';
import { useFileGridDragDrop } from './hooks/useFileGridDragDrop';
import { useFileDragDrop } from './hooks/useFileDragDrop';
import { FileTreeNode } from './utils/simplifiedFileUtils';

interface ProjectFile {
  id: string;
  project_id: string;
  filename: string;
  original_filename: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  uploaded_by: string;
  uploaded_at: string;
}

interface FileGridProps {
  fileTree: FileTreeNode[];
  onFileSelect: (file: ProjectFile) => void;
  onRefresh: () => void;
  onShare: (files: ProjectFile[]) => void;
  onShareFolder: (folderPath: string) => void;
  onCreateSubfolder: (parentFolderPath: string) => void;
}

export function FileGrid({ 
  fileTree, 
  onFileSelect, 
  onRefresh, 
  onShare, 
  onShareFolder, 
  onCreateSubfolder 
}: FileGridProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  // Extract all files from the tree for operations
  const getAllFiles = (nodes: FileTreeNode[]): ProjectFile[] => {
    const files: ProjectFile[] = [];
    const traverse = (nodes: FileTreeNode[]) => {
      nodes.forEach(node => {
        if (node.type === 'file' && node.file) {
          files.push(node.file);
        } else if (node.type === 'folder' && node.children) {
          traverse(node.children);
        }
      });
    };
    traverse(nodes);
    return files;
  };

  const allFiles = getAllFiles(fileTree);

  const {
    selectedFiles,
    isDeleting,
    handleSelectAll,
    handleSelectFile,
    handleBulkDelete
  } = useFileGridOperations(onRefresh);

  const isFileSelected = (fileId: string) => selectedFiles.has(fileId);
  const toggleFileSelection = (fileId: string) => {
    handleSelectFile(fileId, !selectedFiles.has(fileId));
  };
  const selectAllFiles = (checked: boolean) => {
    handleSelectAll(checked, allFiles);
  };

  const dragDropProps = useFileGridDragDrop({ 
    uploadFileToFolder: async () => true, 
    onRefresh 
  });

  const fileDragProps = useFileDragDrop({ 
    moveFileToFolder: async () => true, 
    onRefresh, 
    selectedFiles 
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

  // Recursive function to render tree nodes
  const renderTreeNodes = (nodes: FileTreeNode[], level: number = 0): React.ReactNode => {
    return nodes.map(node => {
      if (node.type === 'folder') {
        const isExpanded = expandedFolders.has(node.path);
        const folderFiles = node.children?.filter(child => child.type === 'file').map(child => child.file!) || [];
        
        return (
          <div key={node.path}>
            <FileGridFolder
              folderPath={node.path}
              folderFiles={folderFiles}
              isExpanded={isExpanded}
              isDragOver={false}
              onToggleFolder={toggleFolder}
              onDragOver={() => {}}
              onDragLeave={() => {}}
              onDrop={() => {}}
              onShareFolder={(folderPath, files) => onShareFolder(folderPath)}
              onCreateSubfolder={() => onCreateSubfolder(node.path)}
              onRefresh={onRefresh}
            />
            {isExpanded && node.children && (
              <div className="ml-4">
                {renderTreeNodes(node.children, level + 1)}
              </div>
            )}
          </div>
        );
      } else if (node.file) {
        return (
          <FileGridCard
            key={node.file.id}
            file={node.file}
            isSelected={isFileSelected(node.file.id)}
            onSelectFile={(fileId, checked) => handleSelectFile(fileId, checked)}
            onFileSelect={() => onFileSelect(node.file!)}
            onRefresh={onRefresh}
            onShare={(file) => onShare([file])}
            isDragging={false}
          />
        );
      }
      return null;
    });
  };

  if (fileTree.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>No files found</p>
      </div>
    );
  }

  const allSelected = allFiles.length > 0 && selectedFiles.size === allFiles.length;
  const someSelected = selectedFiles.size > 0 && selectedFiles.size < allFiles.length;

  return (
    <div className="space-y-6">
      {/* Selection controls */}
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
            onCheckedChange={(checked) => selectAllFiles(checked as boolean)}
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
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Selected
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {renderTreeNodes(fileTree)}
      </div>
    </div>
  );
}