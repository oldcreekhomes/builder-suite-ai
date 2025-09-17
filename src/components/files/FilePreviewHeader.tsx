import React from "react";
import { Button } from "@/components/ui/button";
import { Download, Trash2, X, FileText } from "lucide-react";
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
}

export function FilePreviewHeader({
  file,
  isDeleting,
  onDownload,
  onDelete,
  onClose,
  showDelete = false
}: FilePreviewHeaderProps) {
  return (
    <div className="flex items-center justify-between p-4 border-b bg-background">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
          <h3 className="font-medium text-foreground truncate">
            {file.name}
          </h3>
        </div>
        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
          {file.size && (
            <span>{formatFileSize(file.size)}</span>
          )}
          {file.uploadedAt && (
            <span>{formatDistanceToNow(new Date(file.uploadedAt), { addSuffix: true })}</span>
          )}
          {file.uploadedBy && (
            <span>by {file.uploadedBy}</span>
          )}
        </div>
      </div>
      
      <div className="flex items-center space-x-2 flex-shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={onDownload}
          className="text-muted-foreground hover:text-foreground"
          title="Download file"
        >
          <Download className="h-4 w-4" />
        </Button>
        
        {showDelete && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                disabled={isDeleting}
                className="text-muted-foreground hover:text-destructive"
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
          className="text-muted-foreground hover:text-foreground"
          title="Close preview"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}