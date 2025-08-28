import React from 'react';
import { getFileIcon, getFileIconColor } from '../../bidding/utils/fileIconUtils';
import { openProjectFile } from '@/utils/fileOpenUtils';

interface FilesCellProps {
  files: any;
  projectId: string;
}

export function FilesCell({ files, projectId }: FilesCellProps) {
  const fileCount = files && Array.isArray(files) ? files.length : 0;

  const handleFilePreview = (file: any) => {
    console.log('PURCHASE ORDER FILES: Opening file', file);
    
    // If the file has a direct URL (like proposal files), open it directly
    if (file.url) {
      console.log('Opening file with direct URL:', file.url);
      window.open(file.url, '_blank');
      return;
    }
    
    // Otherwise, build the correct path: purchase-orders/{projectId}/{fileId}
    const filePath = `purchase-orders/${projectId}/${file.id || file.name || file}`;
    const fileName = file.name || file.id || file;
    console.log('File path:', filePath, 'File name:', fileName);
    openProjectFile(filePath, fileName);
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
        const fileName = file.name || file.id || file;
        const IconComponent = getFileIcon(fileName);
        const iconColorClass = getFileIconColor(fileName);
        return (
          <button
            key={`${fileName}-${index}`}
            onClick={() => handleFilePreview(file)}
            className={`inline-block ${iconColorClass} transition-colors p-1`}
            title={fileName}
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
