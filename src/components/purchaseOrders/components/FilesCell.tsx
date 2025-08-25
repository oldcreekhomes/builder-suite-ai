import React from 'react';
import { getFileIcon, getFileIconColor } from '../../bidding/utils/fileIconUtils';

interface FilesCellProps {
  files: any;
}

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
      {files.slice(0, 3).map((file: any, index: number) => {
        const IconComponent = getFileIcon(file.name);
        const iconColorClass = getFileIconColor(file.name);
        return (
          <span key={`${file.name}-${index}`} className={`inline-block ${iconColorClass}`}>
            <IconComponent className="h-4 w-4" />
          </span>
        );
      })}
      {files.length > 3 && (
        <span className="text-xs text-muted-foreground ml-1">
          +{files.length - 3}
        </span>
      )}
    </div>
  );
}