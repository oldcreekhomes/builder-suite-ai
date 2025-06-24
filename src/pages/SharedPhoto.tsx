
import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function SharedPhoto() {
  const { shareId } = useParams();
  const { toast } = useToast();
  const [photo, setPhoto] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // In a real implementation, you'd fetch the photo data based on shareId
    // For now, we'll simulate loading
    const loadPhoto = async () => {
      try {
        // This would typically make an API call to get the shared photo
        // For demo purposes, we'll use a placeholder
        setTimeout(() => {
          setPhoto({
            id: shareId,
            url: "https://via.placeholder.com/800x600",
            description: "Shared Photo"
          });
          setIsLoading(false);
        }, 1000);
      } catch (error) {
        console.error('Error loading shared photo:', error);
        setIsLoading(false);
      }
    };

    if (shareId) {
      loadPhoto();
    }
  }, [shareId]);

  const handleDownload = async () => {
    if (!photo) return;
    
    try {
      const response = await fetch(photo.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = photo.description || `photo-${photo.id}`;
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
      </div>
    );
  }

  if (!photo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Photo Not Found</h1>
          <p className="text-gray-600">The shared photo could not be found or may have expired.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-black">Shared Photo</h1>
          <Button onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </div>
      </header>

      <div className="flex-1 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <img
              src={photo.url}
              alt={photo.description || 'Shared Photo'}
              className="w-full h-auto"
            />
            {photo.description && (
              <div className="p-4">
                <p className="text-gray-700">{photo.description}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
