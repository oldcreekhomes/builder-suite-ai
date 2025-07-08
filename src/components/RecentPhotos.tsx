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

  const recentPhotosSlice = allPhotos.slice(0, 4); // Show 4 most recent photos in 2x2 grid

  if (allPhotos.length === 0) {
    return (
      <Card className="p-3 h-full flex flex-col">
        <div className="flex items-center space-x-1.5 mb-2">
          <Image className="h-3.5 w-3.5 text-gray-600" />
          <h3 className="text-sm font-semibold text-black">Recent Photos</h3>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center py-3">
            <Image className="h-6 w-6 text-gray-400 mx-auto mb-1.5" />
            <p className="text-xs text-gray-500">No photos yet</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="p-3 cursor-pointer hover:shadow-md transition-shadow h-full flex flex-col" onClick={() => setShowPhotoViewer(true)}>
        <div className="flex items-center space-x-1.5 mb-2">
          <Image className="h-3.5 w-3.5 text-gray-600" />
          <h3 className="text-sm font-semibold text-black">Recent Photos</h3>
        </div>
        
        <div className="flex-1 flex flex-col justify-center">
          <div className="grid grid-cols-2 gap-1">
            {recentPhotosSlice.slice(0, 3).map((photo, index) => (
              <div key={photo.id} className="aspect-square rounded-sm overflow-hidden hover:opacity-80 transition-opacity h-16">
                <img
                  src={photo.url}
                  alt={photo.description || 'Recent photo'}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
            
            {allPhotos.length > 3 && (
              <div className="aspect-square rounded-sm bg-gray-100 flex items-center justify-center h-16">
                <div className="text-center">
                  <Plus className="h-2 w-2 text-gray-500 mx-auto mb-0.5" />
                  <span className="text-xs text-gray-500">+{allPhotos.length - 3}</span>
                </div>
              </div>
            )}
          </div>
          
          <p className="text-xs text-gray-500 mt-1.5">({allPhotos.length} total)</p>
        </div>
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