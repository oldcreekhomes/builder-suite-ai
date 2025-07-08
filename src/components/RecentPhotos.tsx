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

  const recentPhotosSlice = allPhotos.slice(0, 9); // Show 9 photos in 3x3 grid, reserve 1 spot for "+X more"

  if (allPhotos.length === 0) {
    return (
      <Card className="h-full flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <Image className="h-5 w-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-black">Recent Photos</h3>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-3">
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
      <Card className="cursor-pointer hover:shadow-md transition-shadow h-full flex flex-col w-full" onClick={() => setShowPhotoViewer(true)}>
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <Image className="h-5 w-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-black">Recent Photos</h3>
          </div>
        </div>
        
        <div className="flex-1 flex flex-col justify-center p-6">
          <div className="grid grid-cols-5 gap-2">
            {recentPhotosSlice.slice(0, 9).map((photo, index) => (
              <div key={photo.id} className="aspect-square rounded-sm overflow-hidden hover:opacity-80 transition-opacity">
                <img
                  src={photo.url}
                  alt={photo.description || 'Recent photo'}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
            
            {allPhotos.length > 9 && (
              <div className="aspect-square rounded-sm bg-gray-100 flex items-center justify-center">
                <div className="text-center">
                  <Plus className="h-3 w-3 text-gray-500 mx-auto mb-1" />
                  <span className="text-xs text-gray-500">+{allPhotos.length - 9}</span>
                </div>
              </div>
            )}
          </div>
          
          <p className="text-xs text-gray-500 mt-3 text-center">({allPhotos.length} total)</p>
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