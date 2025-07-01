
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";

interface FilePreviewModalProps {
  file: any;
  isOpen: boolean;
  onClose: () => void;
}

export function FilePreviewModal({ file, isOpen, onClose }: FilePreviewModalProps) {
  const { toast } = useToast();
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && file) {
      loadFileUrl();
    }
    return () => {
      if (fileUrl) {
        URL.revokeObjectURL(fileUrl);
        setFileUrl(null);
      }
    };
  }, [isOpen, file]);

  const loadFileUrl = async () => {
    setLoading(true);
    try {
      // Get a signed URL with longer expiry for better user experience
      const { data, error } = await supabase.storage
        .from('project-files')
        .createSignedUrl(file.storage_path, 7200); // 2 hours expiry

      if (error) throw error;

      setFileUrl(data.signedUrl);
    } catch (error) {
      console.error('Preview error:', error);
      toast({
        title: "Preview Error",
        description: "Failed to load file preview",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      const { data, error } = await supabase.storage
        .from('project-files')
        .download(file.storage_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.original_filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download Error",
        description: "Failed to download file",
        variant: "destructive",
      });
    }
  };

  const handleOpenInNewTab = () => {
    if (fileUrl) {
      window.open(fileUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const canPreview = (fileType: string) => {
    return ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'txt'].includes(fileType.toLowerCase());
  };

  const renderPreview = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
        </div>
      );
    }

    if (!fileUrl) return null;

    const fileType = file.file_type.toLowerCase();

    if (['jpg', 'jpeg', 'png', 'gif'].includes(fileType)) {
      return (
        <img
          src={fileUrl}
          alt={file.original_filename}
          className="max-w-full max-h-96 object-contain mx-auto"
        />
      );
    }

    if (fileType === 'pdf') {
      return (
        <div className="text-center py-12 space-y-4">
          <p className="text-gray-600 mb-4">PDF Preview</p>
          <div className="space-y-3">
            <Button onClick={handleOpenInNewTab} className="mr-3">
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in New Tab
            </Button>
            <Button variant="outline" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
          </div>
          <p className="text-sm text-gray-500 mt-4">
            Click "Open in New Tab" to view the PDF in your browser
          </p>
        </div>
      );
    }

    if (fileType === 'txt') {
      return (
        <div className="text-center py-12 space-y-4">
          <p className="text-gray-600 mb-4">Text File Preview</p>
          <div className="space-y-3">
            <Button onClick={handleOpenInNewTab} className="mr-3">
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in New Tab
            </Button>
            <Button variant="outline" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download File
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="text-center py-12">
        <p className="text-gray-600 mb-4">Preview not available for this file type</p>
        <Button onClick={handleDownload}>
          <Download className="h-4 w-4 mr-2" />
          Download to View
        </Button>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold">
              {file.original_filename}
            </DialogTitle>
            <div className="flex space-x-2">
              {fileUrl && (
                <Button variant="outline" size="sm" onClick={handleOpenInNewTab}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open in New Tab
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Size:</span> {formatFileSize(file.file_size)}
            </div>
            <div>
              <span className="font-medium">Type:</span> {file.file_type.toUpperCase()}
            </div>
            <div>
              <span className="font-medium">Uploaded:</span> {format(new Date(file.uploaded_at), 'PPP')}
            </div>
            <div>
              <span className="font-medium">By:</span> {file.uploaded_by_profile?.email || 'Unknown'}
            </div>
          </div>

          {file.description && (
            <div>
              <span className="font-medium">Description:</span>
              <p className="text-gray-600 mt-1">{file.description}</p>
            </div>
          )}

          <div className="border-t pt-4">
            {canPreview(file.file_type) ? renderPreview() : (
              <div className="text-center py-12">
                <p className="text-gray-600 mb-4">Preview not available for this file type</p>
                <Button onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  Download to View
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
