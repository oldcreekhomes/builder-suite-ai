
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
  onShare: (file: any) => void;
  onShareFolder: (folderPath: string, files: any[]) => void;
  onCreateSubfolder: (parentPath: string) => void;
}

export function FileList({ files, onFileSelect, onRefresh, onUploadToFolder, onShare, onShareFolder, onCreateSubfolder }: FileListProps) {
  // Start with empty Set - all folders collapsed by default
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

  if (files.length === 0) {
    return <EmptyState />;
  }

  const groupedFiles = groupFilesByFolder(files);
  const sortedFolders = sortFolders(Object.keys(groupedFiles));

  console.log('Grouped files by folder:', groupedFiles);
  console.log('Sorted folders:', sortedFolders);
  console.log('Current expanded folders in render:', Array.from(expandedFolders));
  console.log('All folders should be collapsed by default');

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
            {sortedFolders.map((folderPath) => {
              const folderFiles = groupedFiles[folderPath];
              
              // Handle loose files differently - render them as individual files
              if (folderPath === '__LOOSE_FILES__') {
                return (
                  <React.Fragment key={folderPath}>
                    {folderFiles.map((file) => (
                      <FileRow
                        key={file.id}
                        file={file}
                        isSelected={selectedFiles.has(file.id)}
                        onSelectFile={handleSelectFile}
                        onFileSelect={onFileSelect}
                        onDownload={handleDownload}
                        onDelete={handleDelete}
                        onRefresh={onRefresh}
                        onShare={onShare}
                      />
                    ))}
                  </React.Fragment>
                );
              }
              
              // Handle regular folders
              // Ensure folders are collapsed by default - only expanded if explicitly in the set
              const isExpanded = expandedFolders.has(folderPath);
              const isDragOver = dragOverFolder === folderPath;
              const isFolderSelected = selectedFolders.has(folderPath);
              
              console.log(`Rendering folder ${folderPath}: expanded=${isExpanded}, files=${folderFiles.length}`);
              
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
                    onShareFolder={onShareFolder}
                    onCreateSubfolder={onCreateSubfolder}
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
                      onRefresh={onRefresh}
                      onShare={onShare}
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
