import React from 'react';
import { getFileIcon, getFileIconColor } from '../../bidding/utils/fileIconUtils';
import { useUniversalFilePreviewContext } from '@/components/files/UniversalFilePreviewProvider';

interface FilesCellProps {
  files: any;
  projectId: string;
}

export function FilesCell({ files, projectId }: FilesCellProps) {
  const fileCount = files && Array.isArray(files) ? files.length : 0;
  const { openProjectFile, openSpecificationFile } = useUniversalFilePreviewContext();

  const handleFilePreview = (file: any) => {
    console.log('PURCHASE ORDER FILES: Opening file', file);
    
    const fileName = file.name || file.id || file;
    
    // Check for structured file data with direct bucket and path properties
    if (file.bucket && file.path) {
      console.log('Opening file with direct bucket/path:', file.bucket, file.path);
      if (file.bucket === 'project-files' && file.path.startsWith('specifications/')) {
        openSpecificationFile(file.path, fileName);
      } else {
        openProjectFile(file.path, fileName);
      }
      return;
    }
    
    // If the file has a direct URL (like proposal files), parse it
    if (file.url) {
      console.log('Opening file with direct URL:', file.url);
      
      try {
        const url = new URL(file.url);
        const pathParts = url.pathname.split('/object/public/');
        if (pathParts.length === 2) {
          const [, ...pathSegments] = pathParts[1].split('/');
          const path = pathSegments.join('/');
          const decodedPath = decodeURIComponent(path);
          
          if (decodedPath.startsWith('specifications/')) {
            openSpecificationFile(decodedPath, fileName);
          } else {
            openProjectFile(decodedPath, fileName);
          }
          return;
        }
      } catch (error) {
        console.error('Failed to parse file URL:', error);
      }
    }
    
    // Otherwise, build the correct path for project-files
    const filePath = `purchase-orders/${projectId}/${file.id || file.name || file}`;
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
