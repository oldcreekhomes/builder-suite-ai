
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PhotoViewerNavigationProps {
  totalPhotos: number;
  onPrevious: () => void;
  onNext: () => void;
}

export function PhotoViewerNavigation({
  totalPhotos,
  onPrevious,
  onNext
}: PhotoViewerNavigationProps) {
  if (totalPhotos <= 1) return null;

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={onPrevious}
        className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-600 hover:text-black shadow-md"
      >
        <ChevronLeft className="h-6 w-6" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={onNext}
        className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-600 hover:text-black shadow-md"
      >
        <ChevronRight className="h-6 w-6" />
      </Button>
    </>
  );
}
