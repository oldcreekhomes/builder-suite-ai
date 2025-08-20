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
      if (!bucket || !path) {
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
          setFileUrl(signedData.signedUrl);
          // Redirect immediately
          window.location.href = signedData.signedUrl;
          return;
        }

        // Fallback to public URL for public buckets
        const { data: publicData } = supabase.storage
          .from(bucket)
          .getPublicUrl(path);

        if (publicData?.publicUrl) {
          setFileUrl(publicData.publicUrl);
          // Redirect immediately
          window.location.href = publicData.publicUrl;
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
            <Button onClick={() => window.close()} variant="outline" className="w-full">
              Close Window
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="w-96">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileIcon className="h-5 w-5" />
            {fileName}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            If the file didn't open automatically, click the button below:
          </p>
          {fileUrl && (
            <Button 
              onClick={() => window.location.href = fileUrl} 
              className="w-full"
            >
              <Download className="h-4 w-4 mr-2" />
              Open File
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FileRedirect;