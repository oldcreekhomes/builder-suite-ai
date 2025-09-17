import React from 'react';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/context-menu';
import { ExternalLink, Download, Copy } from 'lucide-react';
import { openFileViaRedirect, downloadFile } from '@/utils/fileOpenUtils';
import { toast } from '@/hooks/use-toast';

interface FileContextMenuProps {
  children: React.ReactNode;
  bucket: string;
  path: string;
  fileName: string;
  fileUrl?: string;
}

export function FileContextMenu({ children, bucket, path, fileName, fileUrl }: FileContextMenuProps) {
  const handleOpenInNewTab = () => {
    openFileViaRedirect(bucket, path, fileName);
  };

  const handleDownload = async () => {
    if (fileUrl) {
      await downloadFile(fileUrl, fileName);
    } else {
      toast({
        title: "Download failed",
        description: "File URL not available",
        variant: "destructive",
      });
    }
  };

  const handleCopyLink = () => {
    const params = new URLSearchParams({ bucket, path, fileName });
    const fileViewerUrl = `${window.location.origin}/file-redirect?${params.toString()}`;
    
    navigator.clipboard.writeText(fileViewerUrl).then(() => {
      toast({
        title: "Link copied",
        description: "File viewer link copied to clipboard",
      });
    }).catch(() => {
      toast({
        title: "Copy failed",
        description: "Could not copy link to clipboard",
        variant: "destructive",
      });
    });
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={handleOpenInNewTab}>
          <ExternalLink className="h-4 w-4 mr-2" />
          Open in New Tab
        </ContextMenuItem>
        <ContextMenuItem onClick={handleDownload}>
          <Download className="h-4 w-4 mr-2" />
          Download File
        </ContextMenuItem>
        <ContextMenuItem onClick={handleCopyLink}>
          <Copy className="h-4 w-4 mr-2" />
          Copy Link
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}