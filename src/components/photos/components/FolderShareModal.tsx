
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Copy, Folder } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ProjectPhoto {
  id: string;
  project_id: string;
  url: string;
  description: string | null;
  uploaded_by: string;
  uploaded_at: string;
}

interface FolderShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  folderPath: string;
  photos: ProjectPhoto[];
  projectId: string;
}

export function FolderShareModal({ isOpen, onClose, folderPath, photos, projectId }: FolderShareModalProps) {
  const { toast } = useToast();
  const [shareLink, setShareLink] = useState("");
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);

  const generateShareLink = async () => {
    setIsGeneratingLink(true);
    try {
      console.log('Generating share link for photos folder:', folderPath);

      // Ensure user is authenticated for RLS policy (created_by = auth.uid())
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      const userId = userData.user?.id;
      if (!userId) throw new Error('You must be logged in to generate a share link.');

      // Check for existing valid share link for this photo folder
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
        // Reuse existing valid link
        const baseUrl = 'https://nlmnwlvmmkngrgatnzkj.supabase.co/functions/v1/share-redirect';
        const shareUrl = `${baseUrl}?id=${existingShare.share_id}&type=p&origin=${encodeURIComponent(window.location.origin)}`;
        setShareLink(shareUrl);
        setIsGeneratingLink(false);
        toast({
          title: "Link Retrieved",
          description: "Using existing shareable link",
        });
        return;
      }

      // Create a unique share ID
      const shareId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

      // Store the share data in Supabase database
      const shareData = {
        folder_path: folderPath,
        photos: photos.map(photo => ({
          id: photo.id,
          url: photo.url,
          description: photo.description,
          project_id: photo.project_id,
          uploaded_by: photo.uploaded_by,
          uploaded_at: photo.uploaded_at
        }))
      };

      const { error } = await supabase
        .from('shared_links')
        .insert({
          share_id: shareId,
          share_type: 'folder',
          data: shareData,
          created_by: userId,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
        });

      if (error) throw error;

      // Use Supabase Edge Function for stable public links with redirect
      const link = `https://nlmnwlvmmkngrgatnzkj.supabase.co/functions/v1/share-redirect?id=${shareId}&type=p&origin=${encodeURIComponent(window.location.origin)}`;
      setShareLink(link);

      toast({
        title: "Link Generated",
        description: `Shareable folder link created with ${photos.length} photos`,
      });
    } catch (error) {
      console.error('Error generating share link:', error);
      toast({
        title: "Error",
        description: "Failed to generate share link",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingLink(false);
    }
  };

  // Auto-generate link when modal opens
  useEffect(() => {
    if (isOpen && !shareLink && photos.length > 0) {
      console.log('Modal opened, generating link for', photos.length, 'photos');
      generateShareLink();
    } else if (isOpen && photos.length === 0) {
      console.warn('No photos to share');
      toast({
        title: "No Photos",
        description: "There are no photos in this folder to share",
        variant: "destructive",
      });
    }
  }, [isOpen, photos.length]);

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
    setShareLink("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Photo Folder</DialogTitle>
          <DialogDescription>
            Generate a shareable link for this photo folder that others can use to view and download the photos.
            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-800 text-sm">
              ⚠️ This link will expire in 7 days. Please download the photos within this timeframe.
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="text-center">
            <div className="w-24 h-24 bg-blue-50 rounded-lg mx-auto mb-2 flex items-center justify-center">
              <Folder className="h-12 w-12 text-blue-500" />
            </div>
            <p className="text-sm font-medium">
              {folderPath === 'Root' ? 'Root Photos' : folderPath}
            </p>
            <p className="text-xs text-gray-500">
              {photos.length} photo{photos.length !== 1 ? 's' : ''}
            </p>
          </div>

          {isGeneratingLink ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-black mx-auto mb-2"></div>
              <p className="text-sm text-gray-500">Generating share link...</p>
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
              <div className="text-xs text-gray-500 text-center">
                Link expires in 7 days
              </div>
            </div>
          ) : photos.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-sm text-gray-500">No photos to share in this folder</p>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
