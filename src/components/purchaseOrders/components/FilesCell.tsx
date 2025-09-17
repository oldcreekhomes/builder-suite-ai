import React from 'react';
import { getFileIcon, getFileIconColor } from '../../bidding/utils/fileIconUtils';
import { openFileViaRedirect } from '@/utils/fileOpenUtils';

interface FilesCellProps {
  files: any;
  projectId: string;
}

export function FilesCell({ files, projectId }: FilesCellProps) {
  const fileCount = files && Array.isArray(files) ? files.length : 0;

  const handleFilePreview = (file: any) => {
    console.log('PURCHASE ORDER FILES: Opening file', file);
    
    // If the file has a direct URL (like proposal files), parse it and use redirect
    if (file.url) {
      console.log('Opening file with direct URL:', file.url);
      
      // Parse the Supabase URL to extract bucket and path
      try {
        const url = new URL(file.url);
        const pathParts = url.pathname.split('/object/public/');
        if (pathParts.length === 2) {
          const [bucket, ...pathSegments] = pathParts[1].split('/');
          const path = pathSegments.join('/');
          const fileName = file.name || path.split('/').pop();
          
          console.log('Parsed URL:', { bucket, path, fileName });
          openFileViaRedirect(bucket, decodeURIComponent(path), fileName);
          return;
        }
      } catch (error) {
        console.error('Failed to parse file URL:', error);
      }
      
      // Fallback: if we can't parse the URL, route via redirect using known patterns
      const fallbackName = file.name || (typeof file === 'string' ? (file.split('_').pop() || file) : 'file');
      const proposalId = file.id || (typeof file === 'string' ? file : undefined);
      if (proposalId && String(proposalId).startsWith('proposal_')) {
        openFileViaRedirect('project-files', `proposals/${proposalId}`, fallbackName);
      } else {
        const id = file.id || file.name || file;
        const path = `purchase-orders/${projectId}/${id}`;
        openFileViaRedirect('project-files', path, fallbackName);
      }
      return;
    }
    
    // Otherwise, build the correct path: purchase-orders/{projectId}/{fileId}
    const filePath = `purchase-orders/${projectId}/${file.id || file.name || file}`;
    const fileName = file.name || file.id || file;
    console.log('File path:', filePath, 'File name:', fileName);
    openFileViaRedirect('project-files', filePath, fileName);
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
