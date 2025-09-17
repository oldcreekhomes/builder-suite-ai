import { useState, useEffect, useCallback, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Copy, FileText } from "lucide-react";
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

interface FileShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: ProjectFile | null;
}

export function FileShareModal({ isOpen, onClose, file }: FileShareModalProps) {
  const { toast } = useToast();
  const [shareLink, setShareLink] = useState("");
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const attemptedRef = useRef(false);
  const lastErrorRef = useRef<string | null>(null);

  const generateShareLink = useCallback(async () => {
    if (!file || attemptedRef.current || isGeneratingLink) return;

    attemptedRef.current = true;
    setIsGeneratingLink(true);
    try {
      console.log('Generating share link for file:', file);

      // Ensure user is authenticated for RLS policy (created_by = auth.uid())
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      const userId = userData.user?.id;
      if (!userId) throw new Error('You must be logged in to generate a share link.');
      
      // Check for existing valid share link for this file
      const { data: existingShare, error: existingError } = await supabase
        .from('shared_links')
        .select('share_id, expires_at')
        .eq('share_type', 'file')
        .gt('expires_at', new Date().toISOString())
        .contains('data', { files: [{ id: file.id }] })
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!existingError && existingShare) {
        // Reuse existing valid link
        const baseUrl = 'https://nlmnwlvmmkngrgatnzkj.supabase.co/functions/v1/share-redirect';
        const shareUrl = `${baseUrl}?id=${existingShare.share_id}&type=f&origin=${encodeURIComponent(window.location.origin)}`;
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
        files: [{
          id: file.id,
          original_filename: file.original_filename,
          file_size: file.file_size,
          file_type: file.file_type,
          storage_path: file.storage_path,
          project_id: file.project_id,
          uploaded_by: file.uploaded_by,
          uploaded_at: file.uploaded_at
        }]
      };

      // Insert share link into database
      const { error } = await supabase
        .from('shared_links')
        .insert({
          share_id: shareId,
          share_type: 'file',
          data: shareData,
          created_by: userId,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
        });

      if (error) {
        throw error;
      }
      
      // Use Supabase Edge Function for stable public links with redirect
      const link = `https://nlmnwlvmmkngrgatnzkj.supabase.co/functions/v1/share-redirect?id=${shareId}&type=f&origin=${encodeURIComponent(window.location.origin)}`;
      setShareLink(link);
      
      toast({
        title: "Link Generated",
        description: "Shareable file link has been created",
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
      setIsGeneratingLink(false);
    }
  }, [file, isGeneratingLink, toast]);

  // Auto-generate link when modal opens
  useEffect(() => {
    if (isOpen && file && !attemptedRef.current) {
      generateShareLink();
    }
  }, [isOpen, file?.id, generateShareLink]);

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
    attemptedRef.current = false;
    lastErrorRef.current = null;
    onClose();
  };

  if (!file) return null;

  const getDisplayName = (filename: string) => {
    if (filename.includes('/')) {
      return filename.split('/').pop() || filename;
    }
    return filename;
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share File</DialogTitle>
          <DialogDescription>
            Generate a shareable link for this file that others can use to download it.
            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-800 text-sm">
              ⚠️ This link will expire in 7 days. Please download the file within this timeframe.
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="text-center">
            <div className="w-24 h-24 bg-blue-50 rounded-lg mx-auto mb-2 flex items-center justify-center">
              <FileText className="h-12 w-12 text-blue-500" />
            </div>
            <p className="text-sm font-medium">
              {getDisplayName(file.original_filename)}
            </p>
          </div>

          {isGeneratingLink ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-black mx-auto mb-2"></div>
              <p className="text-sm text-gray-500">Generating share link...</p>
            </div>
          ) : (
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
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}