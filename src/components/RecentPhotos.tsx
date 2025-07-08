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
      <Card className="p-4 h-fit">
        <div className="flex items-center space-x-2 mb-3">
          <Image className="h-4 w-4 text-gray-600" />
          <h3 className="text-base font-semibold text-black">Recent Photos</h3>
        </div>
        <div className="text-center py-4">
          <Image className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No photos yet</p>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="p-4 cursor-pointer hover:shadow-md transition-shadow h-fit" onClick={() => setShowPhotoViewer(true)}>
        <div className="flex items-center space-x-2 mb-3">
          <Image className="h-4 w-4 text-gray-600" />
          <h3 className="text-base font-semibold text-black">Recent Photos</h3>
        </div>
        
        <div className="grid grid-cols-2 gap-1.5">
          {recentPhotosSlice.slice(0, 3).map((photo, index) => (
            <div key={photo.id} className="aspect-square rounded-md overflow-hidden hover:opacity-80 transition-opacity">
              <img
                src={photo.url}
                alt={photo.description || 'Recent photo'}
                className="w-full h-full object-cover"
              />
            </div>
          ))}
          
          {allPhotos.length > 3 && (
            <div className="aspect-square rounded-md bg-gray-100 flex items-center justify-center">
              <div className="text-center">
                <Plus className="h-4 w-4 text-gray-500 mx-auto mb-1" />
                <span className="text-xs text-gray-500">+{allPhotos.length - 3}</span>
              </div>
            </div>
          )}
        </div>
        
        <p className="text-xs text-gray-500 mt-2">({allPhotos.length} total)</p>
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