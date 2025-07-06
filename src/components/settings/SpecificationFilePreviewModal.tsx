import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface SpecificationFilePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileName: string | null;
}

export function SpecificationFilePreviewModal({ isOpen, onClose, fileName }: SpecificationFilePreviewModalProps) {
  const handleDownload = async () => {
    if (!fileName) return;
    
    try {
      const { data, error } = await supabase.storage
        .from('project-files')
        .download(`specifications/${fileName}`);
      
      if (error) throw error;
      
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName.includes('-') ? fileName.split('-').slice(1).join('-') : fileName; // Remove timestamp prefix for download
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
    }
  };

  const getFilePreview = () => {
    if (!fileName) return null;
    
    const extension = fileName.split('.').pop()?.toLowerCase();
    const { data: { publicUrl } } = supabase.storage
      .from('project-files')
      .getPublicUrl(`specifications/${fileName}`);
    
    if (extension === 'pdf') {
      return (
        <iframe
          src={publicUrl}
          className="w-full h-96 border rounded"
          title="PDF Preview"
        />
      );
    }
    
    // For Excel and Word files, show download message since they can't be previewed in browser
    return (
      <div className="flex flex-col items-center justify-center h-96 bg-gray-50 rounded border">
        <p className="text-gray-600 mb-4">
          This file type cannot be previewed in the browser.
        </p>
        <Button onClick={handleDownload} className="flex items-center space-x-2">
          <Download className="h-4 w-4" />
          <span>Download to View</span>
        </Button>
      </div>
    );
  };

  // Get display name without timestamp prefix
  const getDisplayName = (fileName: string) => {
    if (fileName.includes('-') && /^\d{13}-/.test(fileName)) {
      return fileName.split('-').slice(1).join('-');
    }
    return fileName;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle>{fileName ? getDisplayName(fileName) : 'File Preview'}</DialogTitle>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        <div className="mt-4">
          {getFilePreview()}
        </div>
      </DialogContent>
    </Dialog>
  );
}