
import { useState } from "react";

export function usePhotoZoom() {
  const [zoom, setZoom] = useState(1);

  const zoomIn = () => {
    setZoom(prev => Math.min(prev + 0.25, 3));
  };

  const zoomOut = () => {
    setZoom(prev => Math.max(prev - 0.25, 0.25));
  };

  const resetZoom = () => {
    setZoom(1);
  };

  return {
    zoom,
    zoomIn,
    zoomOut,
    resetZoom
  };
}
