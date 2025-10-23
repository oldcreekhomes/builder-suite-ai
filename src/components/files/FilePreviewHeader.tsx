import React from "react";
import { Button } from "@/components/ui/button";
import { Trash2, X, FileText, Download, ZoomIn, ZoomOut } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { formatDistanceToNow } from "date-fns";
import { formatFileSize } from "./utils/simplifiedFileUtils";
import { UniversalFile } from "./FilePreviewModal";

interface FilePreviewHeaderProps {
  file: UniversalFile;
  isDeleting: boolean;
  onDownload: () => void;
  onDelete: () => void;
  onClose: () => void;
  showDelete?: boolean;
  isPDF?: boolean;
  pageCount?: number;
  isLoadingPages?: boolean;
  zoom?: number;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  canZoomIn?: boolean;
  canZoomOut?: boolean;
}

export function FilePreviewHeader({
  file,
  isDeleting,
  onDownload,
  onDelete,
  onClose,
  showDelete = false,
  isPDF = false,
  pageCount,
  isLoadingPages = false,
  zoom,
  onZoomIn,
  onZoomOut,
  canZoomIn = true,
  canZoomOut = true
}: FilePreviewHeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b bg-background">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <h3 className="font-medium text-foreground truncate text-sm">
          {file.name}
        </h3>
        {isPDF && pageCount && (
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {isLoadingPages ? 'Loading...' : `${pageCount} ${pageCount === 1 ? 'page' : 'pages'}`}
          </span>
        )}
      </div>
      
      <div className="flex items-center gap-1 flex-shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={onDownload}
          className="text-muted-foreground hover:text-foreground h-9 w-9"
          title="Download file"
        >
          <Download className="h-4 w-4" />
        </Button>
        
        {isPDF && onZoomOut && onZoomIn && (
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={onZoomOut}
              disabled={!canZoomOut}
              className="text-muted-foreground hover:text-foreground h-9 w-9"
              title="Zoom out"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            {zoom !== undefined && (
              <span className="text-sm font-medium text-muted-foreground min-w-[50px] text-center">
                {Math.round(zoom * 100)}%
              </span>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={onZoomIn}
              disabled={!canZoomIn}
              className="text-muted-foreground hover:text-foreground h-9 w-9"
              title="Zoom in"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </>
        )}
        
        {showDelete && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                disabled={isDeleting}
                className="text-muted-foreground hover:text-destructive h-9 w-9"
                title="Delete file"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure you want to delete this file?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete "{file.name}".
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={onDelete}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
        
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground h-9 w-9"
          title="Close preview"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}