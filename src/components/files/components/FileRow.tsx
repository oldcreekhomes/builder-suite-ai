
import React from "react";
import { TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Download, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { getDisplayName, formatFileSize, getFileTypeColor } from "../utils/fileUtils";

interface FileRowProps {
  file: any;
  isSelected: boolean;
  onSelectFile: (fileId: string, checked: boolean) => void;
  onFileSelect: (file: any) => void;
  onDownload: (file: any) => void;
  onDelete: (file: any) => void;
}

export function FileRow({
  file,
  isSelected,
  onSelectFile,
  onFileSelect,
  onDownload,
  onDelete,
}: FileRowProps) {
  const displayInfo = getDisplayName(file.original_filename);

  return (
    <TableRow className="hover:bg-gray-50">
      <TableCell>
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => onSelectFile(file.id, checked as boolean)}
        />
      </TableCell>
      <TableCell 
        className="cursor-pointer hover:text-blue-600"
        onClick={() => onFileSelect(file)}
      >
        <div>
          <div className="font-medium">
            {displayInfo.pathWithinFolder || displayInfo.fileName}
          </div>
          {file.description && (
            <div className="text-sm text-gray-500 mt-1">
              {file.description}
            </div>
          )}
        </div>
      </TableCell>
      <TableCell>
        <Badge className={getFileTypeColor(file.file_type)}>
          {file.file_type.toUpperCase()}
        </Badge>
      </TableCell>
      <TableCell>{formatFileSize(file.file_size)}</TableCell>
      <TableCell>{file.uploaded_by_profile?.email || 'Unknown'}</TableCell>
      <TableCell>{format(new Date(file.uploaded_at), 'MMM dd, yyyy')}</TableCell>
      <TableCell>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDownload(file)}
          >
            <Download className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(file)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
