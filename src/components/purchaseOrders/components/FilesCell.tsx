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
    
    // If file is already normalized with bucket/path, use it directly
    if (file?.bucket && file?.path) {
      openFileViaRedirect(file.bucket, file.path, file.name || 'file');
      return;
    }

    // Legacy fallback for any remaining non-normalized files
    const maybeUrl = (file && file.url) || (typeof file === 'string' ? file : undefined);
    if (maybeUrl) {
      let raw = String(maybeUrl).trim();
      raw = raw.replace(/^['"]|['"]$/g, '');
      console.log('Normalized raw URL:', raw);

      if (raw.startsWith('/file-redirect')) {
        try {
          const u = new URL(raw, window.location.origin);
          const bucket = u.searchParams.get('bucket') || 'project-files';
          const path = u.searchParams.get('path') || '';
          const name = u.searchParams.get('fileName') || file?.name || path.split('/').pop() || 'file';
          openFileViaRedirect(bucket, decodeURIComponent(path), name);
          return;
        } catch (e) {
          console.warn('Failed to parse existing redirect URL, falling back:', e);
        }
      }

      try {
        const u = new URL(raw, window.location.origin);
        const publicMatch = u.pathname.match(/\/object\/public\/([^/]+)\/(.+)/);
        if (publicMatch) {
          const bucket = publicMatch[1];
          const path = publicMatch[2];
          const name = file?.name || decodeURIComponent(path.split('/').pop() || 'file');
          console.log('Parsed public URL ->', { bucket, path, name });
          openFileViaRedirect(bucket, decodeURIComponent(path), name);
          return;
        }
      } catch (error) {
        console.warn('Failed to parse URL with URL API, will try regex fallbacks:', error);
      }

      const proposalsIdx = raw.indexOf('/proposals/');
      if (proposalsIdx !== -1) {
        const after = raw.substring(proposalsIdx + '/proposals/'.length).split(/[?#]/)[0];
        const name = file?.name || decodeURIComponent(after.split('/').pop() || after);
        openFileViaRedirect('project-files', `proposals/${decodeURIComponent(after)}`, name);
        return;
      }

      const proposalId = file?.id || (typeof file === 'string' && String(file).startsWith('proposal_') ? String(file) : undefined);
      if (proposalId) {
        const name = file?.name || proposalId.split('_').pop() || proposalId;
        openFileViaRedirect('project-files', `proposals/${proposalId}`, name);
        return;
      }

      if ((file as any)?.bucket && (file as any)?.path) {
        const name = file?.name || (file as any).path.split('/').pop();
        openFileViaRedirect((file as any).bucket, (file as any).path, name);
        return;
      }

      const id = file?.id || file?.name || file;
      const fallbackName = file?.name || (typeof file === 'string' ? (String(file).split('_').pop() || String(file)) : 'file');
      const poPath = `purchase-orders/${projectId}/${id}`;
      openFileViaRedirect('project-files', poPath, fallbackName);
      return;
    }
    
    const filePath = `purchase-orders/${projectId}/${file?.id || file?.name || file}`;
    const fileName = file?.name || file?.id || file;
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
        const fileName = file.name || file.id || String(file);
        const IconComponent = getFileIcon(fileName);
        const iconColorClass = getFileIconColor(fileName);
        return (
          <button
            type="button"
            key={`${fileName}-${index}`}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleFilePreview(file); }}
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
