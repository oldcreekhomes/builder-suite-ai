
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
    const [loading, setLoading] = useState(true);
    const [isDownloading, setIsDownloading] = useState(false);
    const [expired, setExpired] = useState(false);
    const [error, setError] = useState("");

  useEffect(() => {
    const loadFolder = async () => {
      try {
        console.log('Loading shared folder with shareId:', shareId);
        
        if (!shareId) {
          console.error('No shareId provided');
          setError('Invalid share link');
          setLoading(false);
          return;
        }

        // Query share data from Supabase database
        const { data: shareData, error } = await supabase
          .from('shared_links')
          .select('*')
          .eq('share_id', shareId)
          .gt('expires_at', new Date().toISOString())
          .maybeSingle();

        if (error) {
          console.error('Error fetching share data:', error);
          setError('Failed to load shared folder');
          setLoading(false);
          return;
        }

        if (!shareData) {
          console.error('Share data not found for shareId:', shareId);
          setError('Share not found - the link may be invalid or expired');
          setExpired(true);
          setLoading(false);
          return;
        }

        console.log('Retrieved share data:', shareData);

        // Check if the share has expired (additional client-side check)
        const now = new Date();
        const expiryDate = new Date(shareData.expires_at);
        
        if (now > expiryDate) {
          console.log('Share has expired. Now:', now, 'Expires:', expiryDate);
          setExpired(true);
          setLoading(false);
          return;
        }

        // Extract data from the database record (handle both old 'data' and new 'share_data' columns)
        const data = shareData.data as any;

        // Determine share type and set data accordingly
        if (data.files && data.files.length > 0) {
          setShareType('files');
          setFolderName(data.folder_path || data.folderPath || 'Shared Files');
          setFiles(data.files);
          console.log('Successfully loaded shared folder with', data.files.length, 'files');
        } else if (data.photos && data.photos.length > 0) {
          setShareType('photos');
          setFolderName(data.folder_path || data.folderPath || 'Shared Photos');
          setPhotos(data.photos);
          console.log('Successfully loaded shared folder with', data.photos.length, 'photos');
        } else {
          setError('This shared folder is empty');
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error loading shared folder:', error);
          setError('Failed to load shared folder');
          setLoading(false);
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
      // Use the public download edge function
      const response = await fetch(
        `https://nlmnwlvmmkngrgatnzkj.supabase.co/functions/v1/public-file-download?share_id=${shareId}&file_id=${file.id}`
      );

      if (!response.ok) {
        throw new Error('Failed to get download URL');
      }

      const data = await response.json();
      
      // Create a temporary link and trigger download
      const link = document.createElement('a');
      link.href = data.download_url;
      link.download = file.original_filename.includes('/') ? file.original_filename.split('/').pop() : file.original_filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Download Complete",
        description: `${link.download} has been downloaded`,
      });
    } catch (error) {
      console.error('Error downloading file:', error);
      toast({
        title: "Download Error", 
        description: "Failed to download file",
        variant: "destructive",
      });
    }
  };

  const handlePhotoDownload = async (photo: SharedPhoto) => {
    try {
      // Use the public download edge function
      const response = await fetch(
        `https://nlmnwlvmmkngrgatnzkj.supabase.co/functions/v1/public-file-download?share_id=${shareId}&photo_id=${photo.id}`
      );

      if (!response.ok) {
        throw new Error('Failed to get download URL');
      }

      const data = await response.json();
      
      // Create a temporary link and trigger download
      const link = document.createElement('a');
      link.href = data.download_url;
      
      // Extract filename from URL or use a default name
      const filename = photo.url.split('/').pop() || 'photo.jpg';
      link.download = filename;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Download Complete",
        description: `${filename} has been downloaded`,
      });
    } catch (error) {
      console.error('Error downloading photo:', error);
      toast({
        title: "Download Error",
        description: "Failed to download photo",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex-1 w-full min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading shared content...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 w-full min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-destructive text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold mb-2">Error</h1>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (expired) {
    return (
      <div className="flex-1 w-full min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-yellow-500 text-6xl mb-4">⏰</div>
          <h1 className="text-2xl font-bold mb-2">Link Expired</h1>
          <p className="text-muted-foreground mb-4">This share link has expired and is no longer accessible.</p>
          <p className="text-sm text-muted-foreground">Share links are valid for 7 days from creation.</p>
        </div>
      </div>
    );
  }

  if (shareType === 'files' && files.length === 0) {
    return (
      <div className="flex-1 w-full min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">No Files Found</h1>
          <p className="text-muted-foreground">The shared folder is empty.</p>
        </div>
      </div>
    );
  }

  if (shareType === 'photos' && photos.length === 0) {
    return (
      <div className="flex-1 w-full min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">No Photos Found</h1>
          <p className="text-muted-foreground">The shared folder is empty.</p>
        </div>
      </div>
    );
  }

  const itemCount = shareType === 'files' ? files.length : photos.length;
  const itemType = shareType === 'files' ? 'file' : 'photo';

  return (
    <div className="flex-1 w-full min-h-screen bg-background flex items-center justify-center">
      <div className="w-full max-w-2xl px-4 py-8">
        <div className="bg-card rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-2xl font-bold mb-2">
            {folderName}
          </h1>
          <p className="text-muted-foreground mb-3">
            {files.length} file{files.length !== 1 ? 's' : ''} shared with you
          </p>
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800 text-sm font-medium">
              ⚠️ This share link expires in 7 days. Please download the files you need.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {files.map((file) => (
            <div key={file.id} className="bg-card rounded-lg shadow-sm p-4 flex items-center justify-between">
              <div className="flex-1">
                <h3 className="font-medium">
                  {file.original_filename.includes('/') ? file.original_filename.split('/').pop() : file.original_filename}
                </h3>
                <p className="text-xs text-muted-foreground">
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
      </div>
    </div>
  );
}
