import React from 'react';
import { Badge } from '@/components/ui/badge';
import { FileText, File, Image, FileSpreadsheet, FileType } from 'lucide-react';

interface FilesCellProps {
  files: any;
}

const getFileIcon = (fileName: string) => {
  const ext = fileName.toLowerCase().split('.').pop();
  
  switch (ext) {
    case 'pdf':
      return <FileText className="h-3 w-3 text-red-500" />;
    case 'doc':
    case 'docx':
      return <FileText className="h-3 w-3 text-blue-500" />;
    case 'xls':
    case 'xlsx':
      return <FileSpreadsheet className="h-3 w-3 text-green-500" />;
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
      return <Image className="h-3 w-3 text-purple-500" />;
    case 'txt':
      return <FileType className="h-3 w-3 text-gray-500" />;
    default:
      return <File className="h-3 w-3 text-gray-400" />;
  }
};

export function FilesCell({ files }: FilesCellProps) {
  const fileCount = files && Array.isArray(files) ? files.length : 0;

  if (fileCount === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No files
      </div>
    );
  }

  if (fileCount === 1) {
    const file = files[0];
    return (
      <div className="flex items-center gap-1">
        {getFileIcon(file.name)}
        <span className="text-sm text-foreground truncate max-w-[100px]" title={file.name}>
          {file.name}
        </span>
      </div>
    );
  }

  // For multiple files, show count with mixed icons
  const uniqueExtensions = [...new Set(files.map((f: any) => f.name.toLowerCase().split('.').pop()))];
  
  return (
    <div className="flex items-center gap-1">
      {uniqueExtensions.slice(0, 3).map((ext, index) => (
        <span key={`${ext}-${index}`} className="inline-block">
          {getFileIcon(`file.${ext}`)}
        </span>
      ))}
      {uniqueExtensions.length > 3 && (
        <span className="text-xs text-muted-foreground">+{uniqueExtensions.length - 3}</span>
      )}
      <Badge variant="secondary" className="ml-1 text-xs">
        {fileCount}
      </Badge>
    </div>
  );
}