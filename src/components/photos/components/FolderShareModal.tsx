
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Copy, Folder } from "lucide-react";

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
      // Create a unique share ID
      const shareId = Math.random().toString(36).substring(2, 15);
      
      // Store the share data in localStorage for this demo
      // In production, this would be stored in a database
      const shareData = {
        shareId,
        folderPath,
        photos: photos.map(photo => ({
          id: photo.id,
          url: photo.url,
          description: photo.description,
          project_id: photo.project_id,
          uploaded_by: photo.uploaded_by,
          uploaded_at: photo.uploaded_at
        })),
        projectId,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
      };
      
      localStorage.setItem(`share_${shareId}`, JSON.stringify(shareData));
      
      const link = `${window.location.origin}/s/f/${shareId}`;
      setShareLink(link);
      
      toast({
        title: "Link Generated",
        description: "Shareable folder link has been created",
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
    if (isOpen && !shareLink) {
      generateShareLink();
    }
  }, [isOpen]);

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
          <DialogTitle>Share Folder</DialogTitle>
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
