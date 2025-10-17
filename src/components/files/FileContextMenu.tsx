import React from 'react';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/context-menu';
import { Download, Copy } from 'lucide-react';
import { downloadFile } from '@/utils/fileOpenUtils';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface FileContextMenuProps {
  children: React.ReactNode;
  bucket: string;
  path: string;
  fileName: string;
  fileUrl?: string;
}

export function FileContextMenu({ children, bucket, path, fileName, fileUrl }: FileContextMenuProps) {
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
    // Instead of a redirect URL, generate a direct public URL since files are public
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    const publicUrl = data?.publicUrl;
    
    if (publicUrl) {
      navigator.clipboard.writeText(publicUrl).then(() => {
        toast({
          title: "Link copied",
          description: "Direct file link copied to clipboard",
        });
      }).catch(() => {
        toast({
          title: "Copy failed",
          description: "Failed to copy link to clipboard",
          variant: "destructive",
        });
      });
    } else {
      toast({
        title: "Copy failed",
        description: "Could not generate file link",
        variant: "destructive",
      });
    }
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent>
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