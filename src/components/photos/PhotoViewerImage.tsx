import React, { useState, useRef, useCallback } from "react";

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
  panEnabled: boolean;
  onPanToggle: () => void;
}

export function PhotoViewerImage({ photo, zoom, panEnabled, onPanToggle }: PhotoViewerImageProps) {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleImageLoad = () => {
    setImageLoading(false);
    setImageError(false);
  };

  const handleImageError = () => {
    setImageLoading(false);
    setImageError(true);
    console.error('Image failed to load:', photo.url);
  };

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!panEnabled) return;
    
    setIsDragging(true);
    setDragStart({
      x: e.clientX - pan.x,
      y: e.clientY - pan.y
    });
  }, [panEnabled, pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !panEnabled) return;
    
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  }, [isDragging, panEnabled, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Reset pan when zoom changes to 1
  React.useEffect(() => {
    if (zoom === 1) {
      setPan({ x: 0, y: 0 });
    }
  }, [zoom]);

  return (
    <div 
      ref={containerRef}
      className="flex-1 flex items-center justify-center p-4 bg-gray-50 overflow-hidden"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{ cursor: panEnabled ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
    >
      {imageLoading && (
        <div className="text-gray-500">Loading image...</div>
      )}
      {imageError && (
        <div className="text-red-500">Failed to load image</div>
      )}
      <img
        src={photo.url}
        alt={photo.description || 'Project photo'}
        className="max-w-full max-h-full object-contain"
        onLoad={handleImageLoad}
        onError={handleImageError}
        style={{ 
          display: imageLoading || imageError ? 'none' : 'block',
          transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
          transition: isDragging ? 'none' : 'transform 0.2s ease',
          pointerEvents: panEnabled ? 'none' : 'auto'
        }}
      />
    </div>
  );
}
