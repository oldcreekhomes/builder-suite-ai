import React from 'react';
import { getFileIcon, getFileIconColor } from '../../bidding/utils/fileIconUtils';
import { openProjectFile } from '@/utils/fileOpenUtils';

interface FilesCellProps {
  files: any;
}

export function FilesCell({ files }: FilesCellProps) {
  const fileCount = files && Array.isArray(files) ? files.length : 0;

  const handleFilePreview = (fileName: string) => {
    console.log('PURCHASE ORDER FILES: Opening file', fileName);
    // Purchase order files are stored in the project-files bucket under the purchase-orders path  
    openProjectFile(`purchase-orders/${fileName}`, fileName);
  };

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
          <button
            key={`${file.name}-${index}`}
            onClick={() => handleFilePreview(file.name)}
            className={`inline-block ${iconColorClass} transition-colors p-1`}
            title={file.name}
          >
            <IconComponent className="h-4 w-4" />
          </button>
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