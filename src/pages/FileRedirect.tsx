import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const FileRedirect = () => {
  const [searchParams] = useSearchParams();
  
  useEffect(() => {
    const redirectToFile = async () => {
      const bucket = searchParams.get('bucket');
      const path = searchParams.get('path');
      const fileName = searchParams.get('fileName');
      
      if (!bucket || !path) {
        console.error('Missing required parameters: bucket and path');
        return;
      }
      
      try {
        // Try to get signed URL first (more secure)
        const { data: signedData, error: signedError } = await supabase.storage
          .from(bucket)
          .createSignedUrl(path, 3600); // 1 hour expiry
        
        if (!signedError && signedData?.signedUrl) {
          console.log('Redirecting to signed URL:', signedData.signedUrl);
          window.location.replace(signedData.signedUrl);
          return;
        }
        
        // Fallback to public URL
        const { data: publicData } = supabase.storage
          .from(bucket)
          .getPublicUrl(path);
        
        if (publicData?.publicUrl) {
          console.log('Redirecting to public URL:', publicData.publicUrl);
          window.location.replace(publicData.publicUrl);
          return;
        }
        
        console.error('Failed to get file URL');
      } catch (error) {
        console.error('Error redirecting to file:', error);
      }
    };
    
    redirectToFile();
  }, [searchParams]);
  
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting to file...</p>
      </div>
    </div>
  );
};

export default FileRedirect;