
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Move, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface BulkActionBarProps {
  photos: any[];
  selectedPhotos: Set<string>;
  isDeleting: boolean;
  onSelectAll: (checked: boolean) => void;
  onMovePhotos: () => void;
  onBulkDelete: () => void;
  totalSelected?: number;
  totalItems?: number;
}

export function BulkActionBar({ 
  photos, 
  selectedPhotos, 
  isDeleting, 
  onSelectAll, 
  onMovePhotos, 
  onBulkDelete,
  totalSelected,
  totalItems
}: BulkActionBarProps) {
  const selectedCount = totalSelected ?? selectedPhotos.size;
  const itemCount = totalItems ?? photos.length;
  const allSelected = itemCount > 0 && selectedCount === itemCount;
  const someSelected = selectedCount > 0 && selectedCount < itemCount;

  return (
    <div className="flex items-center justify-between bg-white p-4 rounded-lg border">
      <div className="flex items-center space-x-4">
        <Checkbox
          checked={allSelected ? true : someSelected ? "indeterminate" : false}
          onCheckedChange={onSelectAll}
        />
        <span className="text-sm text-gray-600">
          {selectedCount > 0 
            ? `${selectedCount} item(s) selected`
            : `Select all items (${itemCount})`
          }
        </span>
      </div>
      {selectedCount > 0 && (
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onMovePhotos}
          >
            <Move className="h-4 w-4 mr-2" />
            Move to Folder
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                size="sm"
                disabled={isDeleting}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {isDeleting ? 'Deleting...' : `Delete Selected (${selectedCount})`}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure you want to delete {selectedCount} item(s)?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the selected photos and folders from the project.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={onBulkDelete}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  );
}
