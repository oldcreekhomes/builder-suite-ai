import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Image, Plus, XCircle } from "lucide-react";
import { useRecentPhotos } from "@/hooks/useRecentPhotos";
import { usePhotoCount } from "@/hooks/usePhotoCount";
import { CompanyPhotoViewer } from "@/components/CompanyPhotoViewer";
import { getThumbnailUrl } from "@/utils/thumbnailUtils";

export function RecentPhotos() {
  const { data: recentPhotos = [] } = useRecentPhotos(8);
  const { data: totalCount = 0 } = usePhotoCount();
  const [showPhotoViewer, setShowPhotoViewer] = useState(false);

  if (recentPhotos.length === 0) {
    return (
      <Card className="h-full flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <Image className="h-5 w-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-black">Recent Photos</h3>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <XCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="font-medium text-sm">No Photos</p>
            <p className="text-xs text-muted-foreground">Add photos to a project to see them here</p>
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
          <div className="grid grid-cols-3 gap-2">
            {recentPhotos.map((photo) => (
              <div key={photo.id} className="aspect-square rounded-sm overflow-hidden hover:opacity-80 transition-opacity">
                <img
                  src={getThumbnailUrl(photo.url, 256)}
                  alt={photo.description || 'Recent photo'}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
            
            {totalCount > 8 && (
              <div className="aspect-square rounded-sm bg-gray-100 flex items-center justify-center">
                <div className="text-center">
                  <Plus className="h-3 w-3 text-gray-500 mx-auto mb-1" />
                  <span className="text-xs text-gray-500">+{totalCount - 8}</span>
                </div>
              </div>
            )}
          </div>
          
          <p className="text-xs text-gray-500 mt-3 text-center">({totalCount} total)</p>
        </div>
      </Card>

      {showPhotoViewer && recentPhotos.length > 0 && (
        <CompanyPhotoViewer
          photos={recentPhotos}
          currentPhoto={recentPhotos[0]}
          isOpen={showPhotoViewer}
          onClose={() => setShowPhotoViewer(false)}
        />
      )}
    </>
  );
}