
import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { MoreVertical, Download, Trash2, Share2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { formatDistanceToNow } from "date-fns";
import { getThumbnailUrl } from "@/utils/thumbnailUtils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface ProjectPhoto {
  id: string;
  project_id: string;
  url: string;
  description: string | null;
  uploaded_by: string;
  uploaded_at: string;
  uploaded_by_profile?: { email: string };
}

interface PhotoCardProps {
  photo: ProjectPhoto;
  isSelected: boolean;
  isDeleting: boolean;
  onPhotoSelect: (photo: ProjectPhoto) => void;
  onSelectionChange: (photoId: string, checked: boolean) => void;
  onDownload: (photo: ProjectPhoto) => void;
  onShare: (photo: ProjectPhoto) => void;
  onDelete: (photo: ProjectPhoto) => void;
}

export function PhotoCard({
  photo,
  isSelected,
  isDeleting,
  onPhotoSelect,
  onSelectionChange,
  onDownload,
  onShare,
  onDelete
}: PhotoCardProps) {
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Intersection observer for lazy loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '50px' }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, []);
  const getPhotoDisplayName = (photo: ProjectPhoto) => {
    if (!photo.description) return `photo-${photo.id}`;
    
    if (photo.description.includes('/')) {
      return photo.description.split('/').pop() || photo.description;
    }
    
    return photo.description;
  };

  const getPhotoFolder = (photo: ProjectPhoto) => {
    if (!photo.description || !photo.description.includes('/')) return null;
    return photo.description.split('/')[0];
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <Card ref={cardRef} className="group overflow-hidden hover:shadow-lg transition-shadow">
          <div className="relative aspect-square">
            <div className="absolute top-2 left-2 z-10">
              <Checkbox
                checked={isSelected}
                onCheckedChange={(checked) => onSelectionChange(photo.id, checked as boolean)}
                className="bg-white/80 backdrop-blur-sm"
              />
            </div>

            {!isInView ? (
              <Skeleton className="w-full h-full" />
            ) : (
              <>
                {!isImageLoaded && <Skeleton className="w-full h-full absolute inset-0" />}
                {photo.description?.toLowerCase().endsWith('.heic') ? (
                  <div 
                    className="w-full h-full flex items-center justify-center bg-gray-100 cursor-pointer"
                    onClick={() => onPhotoSelect(photo)}
                  >
                    <div className="text-center p-4">
                      <div className="text-2xl mb-2">📸</div>
                      <div className="text-sm text-gray-600">HEIC Photo</div>
                      <div className="text-xs text-red-600 mt-1">Needs Conversion</div>
                    </div>
                  </div>
                ) : (
                <div 
                    className="w-full h-full flex items-center justify-center bg-gray-100 cursor-pointer"
                    onClick={() => onPhotoSelect(photo)}
                  >
                    <img
                      src={getThumbnailUrl(photo.url, 512)}
                      alt={getPhotoDisplayName(photo)}
                      className={`max-w-full max-h-full object-contain transition-opacity duration-300 ${
                        isImageLoaded ? 'opacity-100' : 'opacity-0'
                      }`}
                      loading="lazy"
                      decoding="async"
                      fetchPriority="low"
                      sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                      onLoad={() => setIsImageLoaded(true)}
                      onError={() => setIsImageLoaded(true)}
                    />
                  </div>
                )}
              </>
            )}
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onDownload(photo)}>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onShare(photo)}>
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </DropdownMenuItem>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <DropdownMenuItem 
                        onSelect={(e) => e.preventDefault()}
                        disabled={isDeleting}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {isDeleting ? 'Deleting...' : 'Delete'}
                      </DropdownMenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure you want to delete this picture?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete the photo from the project.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => onDelete(photo)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <div className="p-3">
            <div className="space-y-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <p className="text-sm font-medium truncate cursor-default">
                    {getPhotoDisplayName(photo)}
                  </p>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{getPhotoDisplayName(photo)}</p>
                </TooltipContent>
              </Tooltip>
              {getPhotoFolder(photo) && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <p className="text-xs text-blue-600 truncate cursor-default">
                      📁 {getPhotoFolder(photo)}
                    </p>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Folder: {getPhotoFolder(photo)}</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {formatDistanceToNow(new Date(photo.uploaded_at), { addSuffix: true })}
            </p>
            {photo.uploaded_by_profile && (
              <p className="text-xs text-gray-400 mt-1">
                by {photo.uploaded_by_profile.email}
              </p>
            )}
          </div>
        </Card>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={() => onDownload(photo)}>
          <Download className="h-4 w-4 mr-2" />
          Download
        </ContextMenuItem>
        <ContextMenuItem onClick={() => onShare(photo)}>
          <Share2 className="h-4 w-4 mr-2" />
          Create Link & Share
        </ContextMenuItem>
        <ContextMenuItem 
          onClick={() => onSelectionChange(photo.id, !isSelected)}
        >
          <Checkbox className="h-4 w-4 mr-2" />
          {isSelected ? 'Deselect' : 'Select'}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
