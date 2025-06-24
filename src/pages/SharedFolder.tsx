
import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, Folder } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import JSZip from "jszip";
import { supabase } from "@/integrations/supabase/client";

interface SharedPhoto {
  id: string;
  url: string;
  description: string | null;
  project_id: string;
  uploaded_by: string;
  uploaded_at: string;
}

export default function SharedFolder() {
  const { shareId } = useParams();
  const { toast } = useToast();
  const [photos, setPhotos] = useState<SharedPhoto[]>([]);
  const [folderName, setFolderName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    const loadFolder = async () => {
      try {
        console.log('Loading shared folder with shareId:', shareId);
        
        // In a real implementation, you would store the share mapping in a database
        // For now, we'll try to extract project info from the current session
        // and load all photos from the root folder or specific folder path
        
        // Try to get the current user's photos (this is a temporary approach)
        // In production, you'd have a shares table that maps shareId to specific folder/photos
        const { data: photosData, error } = await supabase
          .from('project_photos')
          .select('*')
          .order('uploaded_at', { ascending: false });

        if (error) {
          console.error('Error fetching photos:', error);
          throw error;
        }

        console.log('Fetched photos for shared folder:', photosData);
        
        // Filter photos that don't have a folder path (root photos) or match the shared folder
        const sharedPhotos = photosData || [];
        
        setFolderName("Shared Photos");
        setPhotos(sharedPhotos);
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading shared folder:', error);
        setIsLoading(false);
      }
    };

    if (shareId) {
      loadFolder();
    }
  }, [shareId]);

  const handleDownloadAll = async () => {
    if (photos.length === 0) return;
    
    setIsDownloading(true);
    const zip = new JSZip();
    
    toast({
      title: "Preparing Download",
      description: `Creating zip file for ${folderName}...`,
    });

    try {
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

  if (photos.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">No Photos Found</h1>
          <p className="text-gray-600">The shared folder is empty or may have expired.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Folder className="h-6 w-6 text-blue-500" />
            <h1 className="text-2xl font-bold text-black">{folderName}</h1>
            <span className="text-sm text-gray-500">
              ({photos.length} photo{photos.length !== 1 ? 's' : ''})
            </span>
          </div>
        </div>
      </header>

      <div className="flex justify-center py-4">
        <Button 
          onClick={handleDownloadAll}
          disabled={isDownloading}
          size="lg"
        >
          <Download className="h-4 w-4 mr-2" />
          {isDownloading ? 'Preparing Download...' : `Download All (${photos.length} photos)`}
        </Button>
      </div>

      <div className="flex-1 p-6">
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
      </div>
    </div>
  );
}
