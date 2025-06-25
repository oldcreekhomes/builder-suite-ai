import React, { useState, useEffect } from "react";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { useFileOperations } from "./hooks/useFileOperations";
import { useFolderDragDrop } from "./hooks/useFolderDragDrop";
import { groupFilesByFolder, sortFolders } from "./utils/fileUtils";
import { FolderHeader } from "./components/FolderHeader";
import { FileRow } from "./components/FileRow";
import { BulkActionBar } from "./components/BulkActionBar";
import { EmptyState } from "./components/EmptyState";

interface FileListProps {
  files: any[];
  onFileSelect: (file: any) => void;
  onRefresh: () => void;
  onUploadToFolder?: (folderName: string, files: File[]) => void;
}

export function FileList({ files, onFileSelect, onRefresh, onUploadToFolder }: FileListProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const {
    selectedFiles,
    selectedFolders,
    isDeleting,
    uploadFileToFolder,
    handleDownload,
    handleDelete,
    handleFolderDelete,
    handleBulkDelete,
    handleSelectAll,
    handleSelectFile,
    handleSelectFolder,
  } = useFileOperations(onRefresh);

  const {
    dragOverFolder,
    handleFolderDragOver,
    handleFolderDragLeave,
    handleFolderDrop,
  } = useFolderDragDrop({ uploadFileToFolder, onRefresh });

  // Only auto-expand Root folder when files change
  useEffect(() => {
    if (files.length > 0) {
      // Only expand the Root folder by default, keep all other folders collapsed
      setExpandedFolders(new Set(['Root']));
    }
  }, [files]);

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
    return <EmptyState />;
  }

  const groupedFiles = groupFilesByFolder(files);
  const sortedFolders = sortFolders(Object.keys(groupedFiles));

  console.log('Grouped files by folder:', groupedFiles);
  console.log('Sorted folders:', sortedFolders);

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
            <TableRow>
              <TableHead className="w-12">
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
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Uploaded By</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedFolders.map((folderPath) => {
              const folderFiles = groupedFiles[folderPath];
              const isExpanded = expandedFolders.has(folderPath);
              const isDragOver = dragOverFolder === folderPath;
              const isFolderSelected = selectedFolders.has(folderPath);
              
              return (
                <React.Fragment key={folderPath}>
                  <FolderHeader
                    folderPath={folderPath}
                    folderFiles={folderFiles}
                    isExpanded={isExpanded}
                    isDragOver={isDragOver}
                    isSelected={isFolderSelected}
                    onToggleFolder={toggleFolder}
                    onSelectFolder={handleSelectFolder}
                    onDragOver={handleFolderDragOver}
                    onDragLeave={handleFolderDragLeave}
                    onDrop={handleFolderDrop}
                  />
                  
                  {isExpanded && folderFiles.map((file) => (
                    <FileRow
                      key={file.id}
                      file={file}
                      isSelected={selectedFiles.has(file.id)}
                      onSelectFile={handleSelectFile}
                      onFileSelect={onFileSelect}
                      onDownload={handleDownload}
                      onDelete={handleDelete}
                    />
                  ))}
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
