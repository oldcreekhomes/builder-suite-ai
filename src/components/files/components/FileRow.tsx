
import React from "react";
import { TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { FileText, Download, Eye, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { getDisplayName, getFileTypeColor, formatFileSize } from "../utils/fileUtils";

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
    <TableRow className="cursor-pointer hover:bg-gray-50">
      <TableCell>
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => onSelectFile(file.id, checked as boolean)}
        />
      </TableCell>
      <TableCell>
        <div className="flex items-center space-x-3 pl-8">
          <FileText className="h-5 w-5 text-blue-500" />
          <div>
            <div className="font-medium" title={displayInfo.fullPath}>
              {displayInfo.pathWithinFolder || displayInfo.fileName}
            </div>
            {file.description && (
              <div className="text-sm text-gray-500">{file.description}</div>
            )}
          </div>
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
            onClick={() => onFileSelect(file)}
          >
            <Eye className="h-4 w-4" />
          </Button>
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
