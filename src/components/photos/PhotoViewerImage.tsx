
import { useState } from "react";

interface ProjectPhoto {
  id: string;
  project_id: string;
  url: string;
  description: string | null;
  uploaded_by: string;
  uploaded_at: string;
  uploaded_by_profile?: { email: string };
}

interface PhotoViewerImageProps {
  photo: ProjectPhoto;
  zoom: number;
}

export function PhotoViewerImage({ photo, zoom }: PhotoViewerImageProps) {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  const handleImageLoad = () => {
    setImageLoading(false);
    setImageError(false);
  };

  const handleImageError = () => {
    setImageLoading(false);
    setImageError(true);
    console.error('Image failed to load:', photo.url);
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4 bg-gray-50 overflow-auto">
      {imageLoading && (
        <div className="text-gray-500">Loading image...</div>
      )}
      {imageError && (
        <div className="text-red-500">Failed to load image</div>
      )}
      <img
        src={photo.url}
        alt={photo.description || 'Project photo'}
        className="max-w-none h-auto object-contain"
        onLoad={handleImageLoad}
        onError={handleImageError}
        style={{ 
          display: imageLoading || imageError ? 'none' : 'block',
          transform: `scale(${zoom})`,
          transition: 'transform 0.2s ease'
        }}
      />
    </div>
  );
}
