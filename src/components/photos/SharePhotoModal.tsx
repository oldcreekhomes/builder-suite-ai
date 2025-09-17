
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Copy, Share2 } from "lucide-react";

interface ProjectPhoto {
  id: string;
  project_id: string;
  url: string;
  description: string | null;
  uploaded_by: string;
  uploaded_at: string;
}

interface SharePhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  photo: ProjectPhoto | null;
}

export function SharePhotoModal({ isOpen, onClose, photo }: SharePhotoModalProps) {
  const { toast } = useToast();
  const [shareLink, setShareLink] = useState("");
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);

  const generateShareLink = async () => {
    if (!photo) return;

    setIsGeneratingLink(true);
    try {
      // Create a shareable link using the photo URL
      // In a real implementation, you might want to create a dedicated sharing endpoint
      const link = `https://buildersuite.com/shared/photo/${photo.id}?url=${encodeURIComponent(photo.url)}`;
      setShareLink(link);
      
      toast({
        title: "Link Generated",
        description: "Shareable link has been created",
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
    if (isOpen && photo && !shareLink) {
      generateShareLink();
    }
  }, [isOpen, photo]);

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

  const shareViaWebAPI = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Photo: ${photo?.description || 'Untitled'}`,
          text: 'Check out this photo',
          url: shareLink,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      // Fallback to copying to clipboard
      copyToClipboard();
    }
  };

  const handleClose = () => {
    setShareLink("");
    onClose();
  };

  if (!photo) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Photo</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="text-center">
            <img
              src={photo.url}
              alt={photo.description || 'Photo'}
              className="w-24 h-24 object-cover rounded-lg mx-auto mb-2"
            />
            <p className="text-sm font-medium">
              {photo.description || 'Untitled Photo'}
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

              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={copyToClipboard}
                  className="flex-1"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Link
                </Button>
                <Button
                  onClick={shareViaWebAPI}
                  className="flex-1"
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
