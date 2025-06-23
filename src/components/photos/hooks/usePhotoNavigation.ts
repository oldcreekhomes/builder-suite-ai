
import { useState, useEffect } from "react";

interface ProjectPhoto {
  id: string;
  project_id: string;
  url: string;
  description: string | null;
  uploaded_by: string;
  uploaded_at: string;
  uploaded_by_profile?: { email: string };
}

interface UsePhotoNavigationProps {
  photos: ProjectPhoto[];
  currentPhoto: ProjectPhoto;
  isOpen: boolean;
}

export function usePhotoNavigation({ photos, currentPhoto, isOpen }: UsePhotoNavigationProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const index = photos.findIndex(photo => photo.id === currentPhoto.id);
    setCurrentIndex(index >= 0 ? index : 0);
  }, [currentPhoto, photos]);

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0));
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'ArrowLeft') goToPrevious();
    if (event.key === 'ArrowRight') goToNext();
  };

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen]);

  return {
    currentIndex,
    goToPrevious,
    goToNext
  };
}
