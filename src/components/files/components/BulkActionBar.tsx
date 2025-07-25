
import React from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

interface BulkActionBarProps {
  selectedCount: number;
  selectedFolderCount: number;
  onBulkDelete: () => void;
  isDeleting: boolean;
}

export function BulkActionBar({ 
  selectedCount, 
  selectedFolderCount, 
  onBulkDelete, 
  isDeleting 
}: BulkActionBarProps) {
  const totalSelected = selectedCount + selectedFolderCount;
  
  if (totalSelected === 0) {
    return null;
  }

  const getSelectionText = () => {
    if (selectedCount > 0 && selectedFolderCount > 0) {
      return `${selectedCount} file(s) and ${selectedFolderCount} folder(s) selected`;
    } else if (selectedCount > 0) {
      return `${selectedCount} file(s) selected`;
    } else {
      return `${selectedFolderCount} folder(s) selected`;
    }
  };

  return (
    <div className="flex items-center justify-between bg-blue-50 p-4 rounded-lg mb-4">
      <span className="text-blue-800 font-medium">
        {getSelectionText()}
      </span>
      <Button
        variant="destructive"
        onClick={onBulkDelete}
        disabled={isDeleting}
      >
        <Trash2 className="h-4 w-4 mr-2" />
        {isDeleting ? "Deleting..." : "Delete Selected"}
      </Button>
    </div>
  );
}
