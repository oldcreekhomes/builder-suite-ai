import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Copy, Folder } from "lucide-react";

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

  const generateShareLink = async () => {
    setIsGeneratingLink(true);
    try {
      console.log('Generating share link for folder:', folderPath);
      console.log('Files to share:', files.length);
      
      // Create a unique share ID
      const shareId = Math.random().toString(36).substring(2, 15);
      
      // Store the share data in localStorage for this demo
      // In production, this would be stored in a database
      const shareData = {
        shareId,
        folderPath,
        files: files.map(file => ({
          id: file.id,
          original_filename: file.original_filename,
          file_size: file.file_size,
          file_type: file.file_type,
          storage_path: file.storage_path,
          project_id: file.project_id,
          uploaded_by: file.uploaded_by,
          uploaded_at: file.uploaded_at
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
        description: `Shareable folder link created with ${files.length} files`,
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
    if (isOpen && !shareLink && files.length > 0) {
      generateShareLink();
    } else if (isOpen && files.length === 0) {
      toast({
        title: "No Files",
        description: "There are no files in this folder to share",
        variant: "destructive",
      });
    }
  }, [isOpen, files.length]);

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