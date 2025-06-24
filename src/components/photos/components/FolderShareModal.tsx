
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Copy, Share2, Link, Folder } from "lucide-react";

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
      // Create a shareable link for the folder
      const photoIds = photos.map(photo => photo.id).join(',');
      const link = `${window.location.origin}/shared/folder/${projectId}?folder=${encodeURIComponent(folderPath)}&photos=${encodeURIComponent(photoIds)}`;
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
          title: `Folder: ${folderPath === 'Root' ? 'Root Photos' : folderPath}`,
          text: `Check out this photo folder with ${photos.length} photos`,
          url: shareLink,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      copyToClipboard();
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

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
