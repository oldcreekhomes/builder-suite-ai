import React from 'react';
import { Badge } from '@/components/ui/badge';
import { FileText } from 'lucide-react';

interface FilesCellProps {
  files: any;
}

export function FilesCell({ files }: FilesCellProps) {
  const fileCount = files && Array.isArray(files) ? files.length : 0;

  if (fileCount === 0) {
    return (
      <div className="text-sm text-gray-400">
        No files
      </div>
    );
  }

  return (
    <Badge variant="secondary" className="gap-1">
      <FileText className="h-3 w-3" />
      {fileCount} file{fileCount !== 1 ? 's' : ''}
    </Badge>
  );
}