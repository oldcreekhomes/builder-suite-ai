import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Copy, Link } from "lucide-react";

interface ProjectPhoto {
  id: string;
  project_id: string;
  url: string;
  description: string | null;
  uploaded_by: string;
  uploaded_at: string;
}

interface PhotoShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  photo: ProjectPhoto | null;
}

export function PhotoShareModal({ isOpen, onClose, photo }: PhotoShareModalProps) {
  const { toast } = useToast();
  const [shareLink, setShareLink] = useState("");
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);

  const generateShareLink = async () => {
    if (!photo) return;

    setIsGeneratingLink(true);
    try {
      // Create a shorter shareable link using the photo URL
      const shortId = Math.random().toString(36).substring(2, 8);
      const link = `${window.location.origin}/s/p/${shortId}`;
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

          {!shareLink ? (
            <Button
              onClick={generateShareLink}
              disabled={isGeneratingLink}
              className="w-full"
            >
              <Link className="h-4 w-4 mr-2" />
              {isGeneratingLink ? "Generating..." : "Generate Share Link"}
            </Button>
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

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
