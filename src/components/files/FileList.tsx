
import React, { useState, useEffect } from "react";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { useFileOperations } from "./hooks/useFileOperations";
import { useFolderDragDrop } from "./hooks/useFolderDragDrop";
import { useFileDragDrop } from "./hooks/useFileDragDrop";
import { FolderHeader } from "./components/FolderHeader";
import { FileRow } from "./components/FileRow";
import { BulkActionBar } from "./components/BulkActionBar";
import { EmptyState } from "./components/EmptyState";
import { FileTreeNode } from "./utils/simplifiedFileUtils";

interface FileListProps {
  files: any[];
  fileTree: FileTreeNode[];
  onFileSelect: (file: any) => void;
  onRefresh: () => void;
  onShare: (file: any) => void;
  onShareFolder: (folderPath: string, files: any[]) => void;
  onCreateSubfolder: (parentPath: string) => void;
}

export function FileList({ files, fileTree, onFileSelect, onRefresh, onShare, onShareFolder, onCreateSubfolder }: FileListProps) {
  // Start with empty Set - all folders collapsed by default
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const {
    selectedFiles,
    selectedFolders,
    isDeleting,
    uploadFileToFolder,
    moveFileToFolder,
    handleDownload,
    handleDelete,
    handleFolderDelete,
    handleBulkDelete,
    handleSelectAll,
    handleSelectFile,
    handleSelectFolder,
  } = useFileOperations(onRefresh);

  const {
    dragOverFolder: uploadDragOverFolder,
    handleFolderDragOver: handleUploadDragOver,
    handleFolderDragLeave: handleUploadDragLeave,
    handleFolderDrop: handleUploadDrop,
  } = useFolderDragDrop({ uploadFileToFolder, onRefresh });

  const {
    isDragging,
    draggedFiles,
    dragOverFolder: moveDragOverFolder,
    getFileDragProps,
    getFolderDropProps,
  } = useFileDragDrop({ moveFileToFolder, onRefresh, selectedFiles });

  // Reset to collapsed state when files change
  useEffect(() => {
    console.log('Files changed, ensuring all folders start collapsed');
    setExpandedFolders(new Set());
  }, [files]);

  const toggleFolder = (folderPath: string) => {
    console.log('=== TOGGLE FOLDER CALLED ===');
    console.log('Folder path:', folderPath);
    console.log('Current expanded folders before toggle:', Array.from(expandedFolders));
    
    setExpandedFolders(prev => {
      const newExpanded = new Set(prev);
      const wasExpanded = newExpanded.has(folderPath);
      
      console.log('Was expanded:', wasExpanded);
      
      if (wasExpanded) {
        newExpanded.delete(folderPath);
        console.log('Folder collapsed:', folderPath);
      } else {
        newExpanded.add(folderPath);
        console.log('Folder expanded:', folderPath);
      }
      
      console.log('New expanded folders after toggle:', Array.from(newExpanded));
      console.log('=== END TOGGLE FOLDER ===');
      return newExpanded;
    });
  };

  if (files.length === 0 && fileTree.length === 0) {
    return <EmptyState />;
  }

  // Render tree nodes recursively
  const renderTreeNodes = (nodes: FileTreeNode[], level: number = 0): React.ReactNode[] => {
    const elements: React.ReactNode[] = [];

    nodes.forEach(node => {
      if (node.type === 'folder') {
        const isExpanded = expandedFolders.has(node.path);
        const isUploadDragOver = uploadDragOverFolder === node.path;
        const isMoveDragOver = moveDragOverFolder === node.path;
        const isDragOver = isUploadDragOver || isMoveDragOver;
        const isFolderSelected = selectedFolders.has(node.path);

        // Get folder files for compatibility with existing components
        const folderFiles = node.children?.filter(child => child.type === 'file').map(child => child.file).filter(Boolean) || [];

        elements.push(
          <FolderHeader
            key={`folder-${node.path}`}
            folderPath={node.path}
            folderFiles={folderFiles}
            isExpanded={isExpanded}
            isDragOver={isDragOver}
            isSelected={isFolderSelected}
            onToggleFolder={toggleFolder}
            onSelectFolder={handleSelectFolder}
            onDragOver={(e, path) => {
              getFolderDropProps(path).onDragOver(e);
              handleUploadDragOver(e, path);
            }}
            onDragLeave={(e) => {
              getFolderDropProps(node.path).onDragLeave(e);
              handleUploadDragLeave(e);
            }}
            onDrop={(e, path) => {
              getFolderDropProps(path).onDrop(e);
              handleUploadDrop(e, path);
            }}
            onShareFolder={onShareFolder}
            onCreateSubfolder={onCreateSubfolder}
            onRefresh={onRefresh}
          />
        );

        // If expanded, render children
        if (isExpanded && node.children) {
          elements.push(...renderTreeNodes(node.children, level + 1));
        }
      } else if (node.type === 'file' && node.file) {
        elements.push(
          <FileRow
            key={node.file.id}
            file={node.file}
            isSelected={selectedFiles.has(node.file.id)}
            onSelectFile={handleSelectFile}
            onFileSelect={onFileSelect}
            onDownload={handleDownload}
            onDelete={handleDelete}
            onRefresh={onRefresh}
            onShare={onShare}
            isDragging={isDragging && draggedFiles.includes(node.file.id)}
            fileDragProps={getFileDragProps(node.file.id)}
          />
        );
      }
    });

    return elements;
  };

  const allSelected = files.length > 0 && selectedFiles.size === files.length;
  const someSelected = selectedFiles.size > 0 && selectedFiles.size < files.length;

  return (
    <div className="space-y-4">
      <BulkActionBar
        selectedCount={selectedFiles.size}
        selectedFolderCount={selectedFolders.size}
        onBulkDelete={handleBulkDelete}
        isDeleting={isDeleting}
      />

      <Card>
        <Table>
          <TableHeader>
            <TableRow className="h-8">
              <TableHead className="w-12 py-1">
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
              </TableHead>
              <TableHead className="py-1">Name</TableHead>
              <TableHead className="py-1">Type</TableHead>
              <TableHead className="py-1">Size</TableHead>
              <TableHead className="py-1">Uploaded By</TableHead>
              <TableHead className="py-1">Date</TableHead>
              <TableHead className="py-1">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {renderTreeNodes(fileTree)}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
