import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileIcon, Download } from 'lucide-react';

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
        // Try to get signed URL first
        const { data: signedData, error: signedError } = await supabase.storage
          .from(bucket)
          .createSignedUrl(path, 3600); // 1 hour expiry

        if (!signedError && signedData?.signedUrl) {
          console.log('FileRedirect: Opening signed URL', signedData.signedUrl);
          window.location.replace(signedData.signedUrl);
          return;
        }

        // Fallback to public URL for public buckets
        const { data: publicData } = supabase.storage
          .from(bucket)
          .getPublicUrl(path);

        if (publicData?.publicUrl) {
          console.log('FileRedirect: Opening public URL', publicData.publicUrl);
          window.location.replace(publicData.publicUrl);
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button onClick={() => window.history.back()} variant="outline" size="sm">
            ← Back
          </Button>
          <FileIcon className="h-5 w-5" />
          <span className="font-medium">{fileName}</span>
        </div>
        {fileUrl && (
          <Button 
            onClick={() => window.open(fileUrl, '_blank')} 
            variant="outline" 
            size="sm"
          >
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        )}
      </div>

      {/* File Viewer */}
      <div className="flex-1 h-[calc(100vh-64px)]">
        {fileUrl && isViewable(fileName) ? (
          isPDF(fileName) ? (
            <iframe
              src={fileUrl}
              className="w-full h-full border-0"
              title={fileName}
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
                    onClick={() => window.open(fileUrl, '_blank')} 
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