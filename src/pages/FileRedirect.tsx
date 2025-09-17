import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileIcon, Download, ExternalLink } from 'lucide-react';
import { PDFViewer } from '@/components/files/PDFViewer';
import { toast } from '@/hooks/use-toast';

const FileRedirect = () => {
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  
  const bucket = searchParams.get('bucket');
  const path = searchParams.get('path');
  const fileName = searchParams.get('fileName') || 'file';

  useEffect(() => {
    const handleFileRedirect = async () => {
      console.log('FileRedirect processing:', { bucket, path, fileName });
      
      if (!bucket || !path) {
        console.error('Missing required parameters:', { bucket, path });
        setError('Invalid file parameters');
        setLoading(false);
        return;
      }

      try {
        // If it's a PDF, try a blob-first approach to avoid CORS/range issues
        if (isPDF(fileName)) {
          const { data: blobData, error: blobError } = await supabase.storage
            .from(bucket)
            .download(path);

          if (!blobError && blobData) {
            const objectUrl = URL.createObjectURL(blobData);
            console.log('FileRedirect: Using blob URL for PDF');
            setFileUrl(objectUrl);
            return;
          } else if (blobError) {
            console.warn('FileRedirect: Blob download failed, falling back to signed/public URL', blobError);
          }
        }

        // Try to get signed URL first
        const { data: signedData, error: signedError } = await supabase.storage
          .from(bucket)
          .createSignedUrl(path, 3600); // 1 hour expiry

        if (!signedError && signedData?.signedUrl) {
          console.log('FileRedirect: Got signed URL', signedData.signedUrl);
          setFileUrl(signedData.signedUrl);
          return;
        }

        // Fallback to public URL for public buckets
        const { data: publicData } = supabase.storage
          .from(bucket)
          .getPublicUrl(path);

        if (publicData?.publicUrl) {
          console.log('FileRedirect: Got public URL', publicData.publicUrl);
          setFileUrl(publicData.publicUrl);
          return;
        }

        throw new Error('Failed to get file URL');
      } catch (err) {
        console.error('File redirect error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load file');
      } finally {
        setLoading(false);
      }
    };

    handleFileRedirect();
  }, [bucket, path]);

  // Cleanup any created blob URLs when file changes or component unmounts
  useEffect(() => {
    return () => {
      if (fileUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(fileUrl);
      }
    };
  }, [fileUrl]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="flex flex-col items-center p-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
            <p>Loading file...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <FileIcon className="h-5 w-5" />
              File Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">{error}</p>
            <div className="flex gap-2">
              <Button onClick={() => window.history.back()} variant="outline" className="flex-1">
                Go Back
              </Button>
              <Button onClick={() => window.close()} variant="outline" className="flex-1">
                Close Window
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getFileExtension = (fileName: string) => {
    return fileName.split('.').pop()?.toLowerCase() || '';
  };

  const isPDF = (fileName: string) => {
    return getFileExtension(fileName) === 'pdf';
  };

  const isViewable = (fileName: string) => {
    const ext = getFileExtension(fileName);
    return ['pdf', 'png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'].includes(ext);
  };

  // Programmatic download function
  const handleDownload = async () => {
    try {
      if (bucket && path) {
        const { data: blobData, error: blobError } = await supabase.storage
          .from(bucket)
          .download(path);
        if (!blobError && blobData) {
          const url = URL.createObjectURL(blobData);
          const link = document.createElement('a');
          link.href = url;
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);

          toast({
            title: 'Download started',
            description: `${fileName} is being downloaded`,
          });
          return;
        }
      }

      // Fallback to downloading from the current fileUrl (blob or http)
      if (!fileUrl) return;
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);

      toast({
        title: 'Download started',
        description: `${fileName} is being downloaded`,
      });
    } catch (error) {
      console.error('Download failed:', error);
      // Fallback to window.open if we have a URL
      if (fileUrl) {
        window.open(fileUrl, '_blank');
      } else if (bucket && path) {
        const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(path);
        if (publicData?.publicUrl) {
          window.open(publicData.publicUrl, '_blank');
        }
      }
    }
  };

  const handleOpenInNewTab = () => {
    const params = new URLSearchParams({ bucket: bucket!, path: path!, fileName });
    const newTabUrl = `/file-redirect?${params.toString()}`;
    
    const newTab = window.open(newTabUrl, '_blank');
    if (!newTab) {
      toast({
        title: "Popup blocked",
        description: "Please allow popups for this site to open files in new tabs",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileIcon className="h-5 w-5" />
          <span className="font-medium">{fileName}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={handleOpenInNewTab}
            variant="outline" 
            size="sm"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Open in New Tab
          </Button>
          {fileUrl && (
            <Button 
              onClick={handleDownload}
              variant="outline" 
              size="sm"
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          )}
        </div>
      </div>

      {/* File Viewer */}
      <div className="flex-1 h-[calc(100vh-64px)]">
        {fileUrl && isViewable(fileName) ? (
          isPDF(fileName) ? (
            <PDFViewer
              fileUrl={fileUrl}
              fileName={fileName}
              onDownload={handleDownload}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <img 
                src={fileUrl} 
                alt={fileName}
                className="max-w-full max-h-full object-contain"
              />
            </div>
          )
        ) : (
          <div className="flex items-center justify-center h-full">
            <Card className="w-96">
              <CardContent className="flex flex-col items-center p-6">
                <FileIcon className="h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-center text-muted-foreground mb-4">
                  This file type cannot be previewed in the browser.
                </p>
                {fileUrl && (
                  <Button 
                    onClick={handleDownload}
                    className="w-full"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download File
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileRedirect;