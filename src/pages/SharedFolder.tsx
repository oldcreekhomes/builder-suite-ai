
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Download, Folder } from "lucide-react";
import JSZip from 'jszip';
import { supabase } from "@/integrations/supabase/client";

interface SharedPhoto {
  id: string;
  url: string;
  description: string | null;
  project_id: string;
  uploaded_by: string;
  uploaded_at: string;
}

interface SharedFile {
  id: string;
  original_filename: string;
  file_size: number;
  file_type: string;
  storage_path: string;
  project_id: string;
  uploaded_by: string;
  uploaded_at: string;
}

interface ShareData {
  shareId: string;
  folderPath: string;
  photos?: SharedPhoto[];
  files?: SharedFile[];
  projectId: string;
  createdAt: string;
  expiresAt: string;
}

export default function SharedFolder() {
  const { shareId } = useParams();
  const { toast } = useToast();
  const [photos, setPhotos] = useState<SharedPhoto[]>([]);
  const [files, setFiles] = useState<SharedFile[]>([]);
  const [folderName, setFolderName] = useState("");
  const [shareType, setShareType] = useState<'photos' | 'files'>('photos');
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadFolder = async () => {
      try {
        console.log('Loading shared folder with shareId:', shareId);
        
        if (!shareId) {
          console.error('No shareId provided');
          setError('Invalid share link');
          setIsLoading(false);
          return;
        }

        // Query share data from Supabase database
        const { data: shareData, error } = await supabase
          .from('shared_links')
          .select('*')
          .eq('share_id', shareId)
          .gt('expires_at', new Date().toISOString())
          .single();

        if (error) {
          console.error('Error fetching share data:', error);
          if (error.code === 'PGRST116') {
            setError('Share not found - the link may be invalid or expired');
          } else {
            setError('Failed to load shared folder');
          }
          setIsLoading(false);
          return;
        }

        if (!shareData) {
          console.error('Share data not found for shareId:', shareId);
          setError('Share not found - the link may be invalid or expired');
          setIsLoading(false);
          return;
        }

        console.log('Retrieved share data:', shareData);

        // Check if the share has expired (additional client-side check)
        const now = new Date();
        const expiryDate = new Date(shareData.expires_at);
        
        if (now > expiryDate) {
          console.log('Share has expired. Now:', now, 'Expires:', expiryDate);
          setIsExpired(true);
          setIsLoading(false);
          return;
        }

        // Extract data from the database record
        const data = shareData.data as any as ShareData;

        // Determine share type and set data accordingly
        if (data.files && data.files.length > 0) {
          setShareType('files');
          setFolderName(data.folderPath === 'Root' ? 'Root Files' : data.folderPath);
          setFiles(data.files);
          console.log('Successfully loaded shared folder with', data.files.length, 'files');
        } else if (data.photos && data.photos.length > 0) {
          setShareType('photos');
          setFolderName(data.folderPath === 'Root' ? 'Root Photos' : data.folderPath);
          setPhotos(data.photos);
          console.log('Successfully loaded shared folder with', data.photos.length, 'photos');
        } else {
          setError('This shared folder is empty');
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading shared folder:', error);
        setError('Failed to load shared folder');
        setIsLoading(false);
      }
    };

    if (shareId) {
      loadFolder();
    }
  }, [shareId]);

  const handleDownloadAll = async () => {
    const items = shareType === 'files' ? files : photos;
    if (items.length === 0) return;
    
    setIsDownloading(true);
    const zip = new JSZip();
    
    toast({
      title: "Preparing Download",
      description: `Creating zip file for ${folderName}...`,
    });

    try {
      if (shareType === 'files') {
        // Add all files to the zip
        for (const file of files) {
          try {
            console.log('Downloading file:', file.original_filename);
            // For files, we would need to get the actual file content from Supabase storage
            // Since this is a share link, we'll need to create a temporary signed URL
            // For now, we'll skip the actual file download since we don't have access
            console.warn('File download from shared links not yet implemented');
          } catch (error) {
            console.error(`Failed to add ${file.original_filename} to zip:`, error);
          }
        }
      } else {
        // Add all photos to the zip
        for (const photo of photos) {
          try {
            console.log('Downloading photo:', photo.url);
            const response = await fetch(photo.url);
            const blob = await response.blob();
            
            // Extract file extension from URL or use a default
            const urlParts = photo.url.split('.');
            const extension = urlParts.length > 1 ? urlParts[urlParts.length - 1].split('?')[0] : 'jpg';
            
            // Create a filename, using description if available
            let fileName = photo.description || `photo-${photo.id}`;
            
            // If description contains folder path, extract just the filename
            if (fileName.includes('/')) {
              fileName = fileName.split('/').pop() || fileName;
            }
            
            // Ensure the filename has an extension
            if (!fileName.includes('.')) {
              fileName += `.${extension}`;
            }
            
            zip.file(fileName, blob);
            console.log('Added to zip:', fileName);
          } catch (error) {
            console.error(`Failed to add ${photo.description || photo.id} to zip:`, error);
          }
        }

        // Generate the zip file
        const zipBlob = await zip.generateAsync({ type: "blob" });
        
        // Create download link
        const url = window.URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${folderName}.zip`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast({
          title: "Download Complete",
          description: `${folderName}.zip has been downloaded with ${photos.length} photos`,
        });
      }
    } catch (error) {
      console.error('Zip creation error:', error);
      toast({
        title: "Download Error",
        description: "Failed to create zip file",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleFileDownload = async (file: SharedFile) => {
    try {
      console.log('Downloading file:', file);
      
      // Get a signed URL from Supabase storage
      const { data, error } = await supabase.storage
        .from('project-files')
        .createSignedUrl(file.storage_path, 7200); // 2 hours expiry

      if (error) {
        console.error('Error creating signed URL:', error);
        throw error;
      }

      if (!data?.signedUrl) {
        throw new Error('No signed URL returned');
      }

      // Download the file
      const response = await fetch(data.signedUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      // Use the original filename
      let fileName = file.original_filename;
      if (fileName.includes('/')) {
        fileName = fileName.split('/').pop() || fileName;
      }
      a.download = fileName;
      
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Download Complete",
        description: `${fileName} has been downloaded`,
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download Error",
        description: "Failed to download file. The file may no longer be available.",
        variant: "destructive",
      });
    }
  };

  const handlePhotoDownload = async (photo: SharedPhoto) => {
    try {
      console.log('Downloading individual photo:', photo.url);
      const response = await fetch(photo.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      // Create a proper filename
      let fileName = photo.description || `photo-${photo.id}`;
      if (fileName.includes('/')) {
        fileName = fileName.split('/').pop() || fileName;
      }
      if (!fileName.includes('.')) {
        const urlParts = photo.url.split('.');
        const extension = urlParts.length > 1 ? urlParts[urlParts.length - 1].split('?')[0] : 'jpg';
        fileName += `.${extension}`;
      }
      
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download Error",
        description: "Failed to download photo",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Loading shared folder...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Share Not Found</h1>
          <p className="text-gray-600">{error}</p>
          <p className="text-sm text-gray-500 mt-2">Please check the link and try again.</p>
        </div>
      </div>
    );
  }

  if (isExpired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Share Expired</h1>
          <p className="text-gray-600">This shared folder link has expired.</p>
        </div>
      </div>
    );
  }

  if (shareType === 'files' && files.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">No Files Found</h1>
          <p className="text-gray-600">The shared folder is empty.</p>
        </div>
      </div>
    );
  }

  if (shareType === 'photos' && photos.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">No Photos Found</h1>
          <p className="text-gray-600">The shared folder is empty.</p>
        </div>
      </div>
    );
  }

  const itemCount = shareType === 'files' ? files.length : photos.length;
  const itemType = shareType === 'files' ? 'file' : 'photo';

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Folder className="h-6 w-6 text-blue-500" />
            <h1 className="text-2xl font-bold text-black">{folderName}</h1>
            <span className="text-sm text-gray-500">
              ({itemCount} {itemType}{itemCount !== 1 ? 's' : ''})
            </span>
          </div>
        </div>
      </header>

      {shareType === 'photos' && (
        <div className="flex justify-center py-4">
          <Button 
            onClick={handleDownloadAll}
            disabled={isDownloading}
            size="lg"
          >
            <Download className="h-4 w-4 mr-2" />
            {isDownloading ? 'Preparing Download...' : `Download All (${itemCount} ${itemType}s)`}
          </Button>
        </div>
      )}

      <div className="flex-1 p-6">
        {shareType === 'files' ? (
          <div className="grid grid-cols-1 gap-4">
            {files.map((file) => (
              <div key={file.id} className="bg-white rounded-lg shadow-sm p-4 flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{file.original_filename}</h3>
                  <p className="text-sm text-gray-500">
                    {file.file_type.toUpperCase()} • {Math.round(file.file_size / 1024)} KB
                  </p>
                  <p className="text-xs text-gray-400">
                    Uploaded: {new Date(file.uploaded_at).toLocaleDateString()}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleFileDownload(file)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {photos.map((photo) => (
              <div key={photo.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
                <img
                  src={photo.url}
                  alt={photo.description || 'Photo'}
                  className="w-full h-48 object-cover"
                  onError={(e) => {
                    console.error('Failed to load image:', photo.url);
                    e.currentTarget.src = 'https://via.placeholder.com/300x200?text=Image+Not+Found';
                  }}
                />
                <div className="p-3">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {photo.description || 'Untitled Photo'}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePhotoDownload(photo)}
                    className="mt-2 w-full"
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Download
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
