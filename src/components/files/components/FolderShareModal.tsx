import { useState, useEffect, useCallback, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Copy, Folder } from "lucide-react";
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
  projectId: string;
}

export function FolderShareModal({ isOpen, onClose, folderPath, files, projectId }: FolderShareModalProps) {
  const { toast } = useToast();
  const [shareLink, setShareLink] = useState("");
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const attemptedRef = useRef(false);
  const lastErrorRef = useRef<string | null>(null);

  const generateShareLink = useCallback(async () => {
    if (!files || files.length === 0 || attemptedRef.current || isGeneratingLink) return;

    attemptedRef.current = true;
    setIsGeneratingLink(true);
    try {
      console.log('Generating share link for folder:', folderPath, 'with files:', files);
      
      // Ensure user is authenticated for RLS policy (created_by = auth.uid())
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      const userId = userData.user?.id;
      if (!userId) throw new Error('You must be logged in to generate a share link.');
      
      // Create a unique share ID
      const shareId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      
      // Store the share data in Supabase database
      const shareData = {
        folderPath,
        files: files.map(file => ({
          id: file.id,
          original_filename: file.original_filename,
          file_size: file.file_size,
          file_type: file.file_type,
          storage_path: file.storage_path,
          project_id: projectId,
          uploaded_by: file.uploaded_by,
          uploaded_at: file.uploaded_at
        })),
        projectId
      };

      // Insert share link into database
      const { error } = await supabase
        .from('shared_links')
        .insert({
          share_id: shareId,
          share_type: 'folder',
          data: shareData,
          created_by: userId,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
        });

      if (error) {
        throw error;
      }
      
      // Use current domain for share links
      const link = `${window.location.origin}/s/f/${shareId}`;
      setShareLink(link);
      
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
      setIsGeneratingLink(false);
    }
  }, [files, folderPath, projectId, isGeneratingLink, toast]);

  // Auto-generate link when modal opens
  useEffect(() => {
    if (isOpen && !shareLink && files.length > 0) {
      generateShareLink();
    } else if (isOpen && files.length === 0) {
      toast({
        title: "No Files",
        description: "There are no files in this folder to share",
        variant: "destructive",
      });
    }
  }, [isOpen, files.length, shareLink, generateShareLink, toast]);

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

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Folder</DialogTitle>
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
              {files.length} file{files.length !== 1 ? 's' : ''}
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
          ) : files.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-sm text-gray-500">No files to share in this folder</p>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}