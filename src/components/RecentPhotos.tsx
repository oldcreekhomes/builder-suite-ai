import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Image, Plus } from "lucide-react";
import { useRecentPhoto } from "@/hooks/useRecentPhoto";
import { useAllPhotos } from "@/hooks/useAllPhotos";
import { CompanyPhotoViewer } from "@/components/CompanyPhotoViewer";

export function RecentPhotos() {
  const { data: recentPhoto } = useRecentPhoto();
  const { data: allPhotos = [] } = useAllPhotos();
  const [showPhotoViewer, setShowPhotoViewer] = useState(false);

  const recentPhotosSlice = allPhotos.slice(0, 6); // Show 6 most recent photos

  if (allPhotos.length === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Image className="h-5 w-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-black">Recent Photos</h3>
        </div>
        <div className="text-center py-8">
          <Image className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No photos yet</p>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="p-6 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setShowPhotoViewer(true)}>
        <div className="flex items-center space-x-2 mb-4">
          <Image className="h-5 w-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-black">Recent Photos</h3>
          <span className="text-sm text-gray-500">({allPhotos.length} total)</span>
        </div>
        
        <div className="grid grid-cols-3 gap-2">
          {recentPhotosSlice.slice(0, 5).map((photo, index) => (
            <div key={photo.id} className="aspect-square rounded-lg overflow-hidden hover:opacity-80 transition-opacity">
              <img
                src={photo.url}
                alt={photo.description || 'Recent photo'}
                className="w-full h-full object-cover"
              />
            </div>
          ))}
          
          {allPhotos.length > 5 && (
            <div className="aspect-square rounded-lg bg-gray-100 flex items-center justify-center">
              <div className="text-center">
                <Plus className="h-6 w-6 text-gray-500 mx-auto mb-1" />
                <span className="text-xs text-gray-500">+{allPhotos.length - 5}</span>
              </div>
            </div>
          )}
        </div>
        
        <p className="text-sm text-gray-500 mt-3">Click to view all photos</p>
      </Card>

      {showPhotoViewer && recentPhoto && (
        <CompanyPhotoViewer
          photos={allPhotos}
          currentPhoto={recentPhoto}
          isOpen={showPhotoViewer}
          onClose={() => setShowPhotoViewer(false)}
        />
      )}
    </>
  );
}