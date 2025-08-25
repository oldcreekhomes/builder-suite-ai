import React from 'react';
import { Badge } from '@/components/ui/badge';
import { FileText, File, Image, FileSpreadsheet } from 'lucide-react';

interface FilesCellProps {
  files: any;
}

const getFileIcon = (fileName: string) => {
  const ext = fileName.toLowerCase().split('.').pop();
  
  switch (ext) {
    case 'pdf':
      return <FileText className="h-4 w-4 text-red-500" />;
    case 'doc':
    case 'docx':
      return <FileText className="h-4 w-4 text-blue-500" />;
    case 'xls':
    case 'xlsx':
      return <FileSpreadsheet className="h-4 w-4 text-green-500" />;
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
      return <Image className="h-4 w-4 text-blue-500" />;
    default:
      return <File className="h-4 w-4 text-gray-500" />;
  }
};

export function FilesCell({ files }: FilesCellProps) {
  const fileCount = files && Array.isArray(files) ? files.length : 0;

  if (fileCount === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        —
      </div>
    );
  }

  // Show file icons without names
  return (
    <div className="flex items-center gap-1">
      {files.slice(0, 3).map((file: any, index: number) => (
        <span key={`${file.name}-${index}`} className="inline-block">
          {getFileIcon(file.name)}
        </span>
      ))}
      {files.length > 3 && (
        <span className="text-xs text-muted-foreground ml-1">
          +{files.length - 3}
        </span>
      )}
    </div>
  );
}