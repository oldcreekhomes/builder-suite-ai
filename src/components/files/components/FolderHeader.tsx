
import React from "react";
import { TableRow, TableCell } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Folder, ChevronRight, ChevronDown } from "lucide-react";

interface FolderHeaderProps {
  folderPath: string;
  folderFiles: any[];
  isExpanded: boolean;
  isDragOver: boolean;
  isSelected: boolean;
  onToggleFolder: (folderPath: string) => void;
  onSelectFolder: (folderPath: string, checked: boolean) => void;
  onDragOver: (e: React.DragEvent, folderName: string) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, folderName: string) => void;
}

export function FolderHeader({
  folderPath,
  folderFiles,
  isExpanded,
  isDragOver,
  isSelected,
  onToggleFolder,
  onSelectFolder,
  onDragOver,
  onDragLeave,
  onDrop,
}: FolderHeaderProps) {
  // Calculate folder depth for indentation
  const folderDepth = folderPath === 'Root' ? 0 : folderPath.split('/').length;
  const indentLevel = Math.max(0, folderDepth - 1);
  
  // Get display name (last part of the path for nested folders)
  const displayName = folderPath === 'Root' ? 'Root Files' : 
    folderPath.split('/').pop() || folderPath;
  
  // Show full path in subtle text for nested folders
  const showFullPath = folderPath !== 'Root' && folderPath.includes('/');
  
  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };
  
  const handleExpandClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFolder(folderPath);
  };
  
  return (
    <TableRow 
      className={`border-b-2 cursor-pointer transition-colors ${
        isDragOver 
          ? 'bg-blue-100 border-blue-300' 
          : 'bg-gray-50 hover:bg-gray-100'
      }`}
      onDragOver={(e) => onDragOver(e, folderPath)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, folderPath)}
      onClick={handleExpandClick}
    >
      <TableCell className="w-12">
        <div onClick={handleCheckboxClick}>
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => onSelectFolder(folderPath, checked as boolean)}
          />
        </div>
      </TableCell>
      <TableCell colSpan={6}>
        <div 
          className="flex items-center space-x-2 py-1"
          style={{ paddingLeft: `${indentLevel * 20}px` }}
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-gray-500" />
          ) : (
            <ChevronRight className="h-4 w-4 text-gray-500" />
          )}
          <Folder className="h-5 w-5 text-blue-500" />
          <div className="flex flex-col">
            <span className="font-semibold text-gray-700">
              {displayName}
            </span>
            {showFullPath && (
              <span className="text-xs text-gray-500">
                {folderPath}
              </span>
            )}
          </div>
          <span className="text-sm text-gray-500">
            ({folderFiles.length} file{folderFiles.length !== 1 ? 's' : ''})
          </span>
          {isDragOver && (
            <span className="text-sm text-blue-600 ml-2">
              Drop files here to upload to this folder
            </span>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}
