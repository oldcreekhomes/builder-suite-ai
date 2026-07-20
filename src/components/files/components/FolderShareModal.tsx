import { useState, useEffect, useCallback, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Copy, Folder, Share2, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ProjectFile {
  id: string;
  project_id: string;
  original_filename: string;
  file_size: number;
  file_type: string;
  storage_path: string;
  uploaded_by: string;
  uploaded_at: string;
  uploaded_by_profile?: { email: string };
}

interface FolderShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  folderPath: string;
  files: ProjectFile[];
  folders: string[];
  projectId: string;
}

export function FolderShareModal({ isOpen, onClose, folderPath, files, folders, projectId }: FolderShareModalProps) {
  const { toast } = useToast();
  const [shareLink, setShareLink] = useState("");
  const [shareId, setShareId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasCheckedExisting, setHasCheckedExisting] = useState(false);
  const lastErrorRef = useRef<string | null>(null);

  const baseUrl = 'https://nlmnwlvmmkngrgatnzkj.supabase.co/functions/v1/share-redirect';

  const resetState = useCallback(() => {
    setShareLink("");
    setShareId(null);
    setHasCheckedExisting(false);
    setIsLoading(false);
    lastErrorRef.current = null;
  }, []);

  const lookupExistingLink = useCallback(async () => {
    if (!folderPath || isLoading || hasCheckedExisting) return;

    setIsLoading(true);
    try {
      const { data: existingShare, error: existingError } = await supabase
        .from('shared_links')
        .select('share_id, expires_at')
        .eq('share_type', 'folder')
        .gt('expires_at', new Date().toISOString())
        .contains('data', { folder_path: folderPath })
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!existingError && existingShare) {
        setShareId(existingShare.share_id);
        setShareLink(`${baseUrl}?id=${existingShare.share_id}&type=f`);
      }
      setHasCheckedExisting(true);
    } catch (error: any) {
      console.error('Error looking up share link:', error);
    } finally {
      setIsLoading(false);
    }
  }, [folderPath, hasCheckedExisting, isLoading]);

  // Look up existing link when modal opens
  useEffect(() => {
    if (isOpen && !hasCheckedExisting) {
      lookupExistingLink();
    }
  }, [isOpen, hasCheckedExisting, lookupExistingLink]);

  const generateShareLink = useCallback(async () => {
    if ((!files || files.length === 0) && (!folders || folders.length === 0) || isLoading) return;

    setIsLoading(true);
    try {
      // Ensure user is authenticated for RLS policy (created_by = auth.uid())
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      const userId = userData.user?.id;
      if (!userId) throw new Error('You must be logged in to generate a share link.');

      // Create a unique share ID
      const newShareId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

      // Store the share data in Supabase database
      const shareData = {
        folder_path: folderPath,
        folders,
        files: files.map(file => ({
          id: file.id,
          original_filename: file.original_filename,
          file_size: file.file_size,
          file_type: file.file_type,
          storage_path: file.storage_path,
          project_id: projectId,
          uploaded_by: file.uploaded_by,
          uploaded_at: file.uploaded_at
        }))
      };

      // Insert share link into database
      const { error } = await supabase
        .from('shared_links')
        .insert({
          share_id: newShareId,
          share_type: 'folder',
          data: shareData,
          created_by: userId,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
        });

      if (error) throw error;

      setShareId(newShareId);
      setShareLink(`${baseUrl}?id=${newShareId}&type=f`);

      toast({
        title: "Link Generated",
        description: "Shareable folder link has been created",
      });
    } catch (error: any) {
      console.error('Error generating share link:', error);
      const msg = error?.message || 'Failed to generate share link';
      if (lastErrorRef.current !== msg) {
        lastErrorRef.current = msg;
        toast({
          title: "Error",
          description: msg,
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [files, folders, folderPath, projectId, isLoading, toast]);

  const handleUnshare = useCallback(async () => {
    if (!shareId || isLoading) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('shared_links')
        .delete()
        .eq('share_id', shareId);

      if (error) throw error;

      setShareLink("");
      setShareId(null);
      toast({
        title: "Link Removed",
        description: "The share link has been revoked. The old URL no longer works.",
      });
    } catch (error: any) {
      console.error('Error removing share link:', error);
      toast({
        title: "Error",
        description: error?.message || 'Failed to remove share link',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [shareId, isLoading, toast]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      toast({
        title: "Copied!",
        description: "Link copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy link to clipboard",
        variant: "destructive",
      });
    }
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const fileCount = files.length;
  const folderCount = folders.length;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Folder</DialogTitle>
          <DialogDescription>
            Generate a shareable link for this folder that others can use to view and download the files.
            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-800 text-sm">
              ⚠️ This link will expire in 7 days. Please download the files within this timeframe.
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="text-center">
            <div className="w-24 h-24 bg-blue-50 rounded-lg mx-auto mb-2 flex items-center justify-center">
              <Folder className="h-12 w-12 text-blue-500" />
            </div>
            <p className="text-sm font-medium">
              {folderPath === 'Root' ? 'Root Files' : folderPath}
            </p>
            <p className="text-xs text-gray-500">
              {folderCount} folder{folderCount !== 1 ? 's' : ''} · {fileCount} file{fileCount !== 1 ? 's' : ''}
            </p>
          </div>

          {isLoading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-black mx-auto mb-2"></div>
              <p className="text-sm text-gray-500">
                {shareLink ? 'Removing share link...' : 'Checking for existing link...'}
              </p>
            </div>
          ) : shareLink ? (
            <div className="space-y-3">
              <div>
                <Label htmlFor="shareLink">Share Link</Label>
                <div className="flex mt-1">
                  <Input
                    id="shareLink"
                    value={shareLink}
                    readOnly
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={copyToClipboard}
                    className="ml-2"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={copyToClipboard}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Link
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={handleUnshare}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Unshare
                </Button>
              </div>
              <div className="text-xs text-gray-500 text-center">
                Link expires in 7 days
              </div>
            </div>
          ) : fileCount === 0 && folderCount === 0 ? (
            <div className="text-center py-4">
              <p className="text-sm text-gray-500">No files to share in this folder</p>
            </div>
          ) : (
            <div className="space-y-3">
              <Button
                className="w-full"
                onClick={generateShareLink}
                disabled={isLoading}
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share Folder
              </Button>
              <p className="text-xs text-gray-500 text-center">
                No active share link for this folder.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
