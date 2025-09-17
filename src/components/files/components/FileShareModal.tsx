import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

  const generateShareLink = useCallback(async () => {
    if (!file) return;

    setIsGeneratingLink(true);
    try {
      console.log('Generating share link for file:', file);
      
      // Create a unique share ID
      const shareId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      
      // Store the share data in Supabase database
      const shareData = {
        folderPath: 'Single File',
        files: [{
          id: file.id,
          original_filename: file.original_filename,
          file_size: file.file_size,
          file_type: file.file_type,
          storage_path: file.storage_path,
          project_id: file.project_id,
          uploaded_by: file.uploaded_by,
          uploaded_at: file.uploaded_at
        }],
        projectId: file.project_id
      };

      // Insert share link into database
      const { error } = await supabase
        .from('shared_links')
        .insert({
          share_id: shareId,
          share_type: 'file',
          data: shareData,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
        });

      if (error) {
        throw error;
      }
      
      // Use BuilderSuite domain instead of current origin
      const link = `https://app.buildersuite.com/s/f/${shareId}`;
      setShareLink(link);
      
      toast({
        title: "Link Generated",
        description: "Shareable file link has been created",
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
  }, [file, toast]);

  // Auto-generate link when modal opens
  useEffect(() => {
    if (isOpen && file && !shareLink) {
      generateShareLink();
    }
  }, [isOpen, file?.id, shareLink, generateShareLink]);

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