
import React from "react";

import { Trash2 } from "lucide-react";
import { DeleteButton } from "@/components/ui/delete-button";

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
      <DeleteButton
        onDelete={onBulkDelete}
        title="Delete Selected"
        description="Are you sure you want to delete the selected items? This action cannot be undone."
        variant="destructive"
        isLoading={isDeleting}
        showIcon={true}
      >
        <Trash2 className="h-4 w-4 mr-2" />
        {isDeleting ? "Deleting..." : "Delete Selected"}
      </DeleteButton>
    </div>
  );
}
