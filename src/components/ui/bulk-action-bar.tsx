import React from "react";
import { Trash2 } from "lucide-react";
import { DeleteButton } from "@/components/ui/delete-button";

interface BulkActionBarProps {
  selectedCount: number;
  onBulkDelete: () => void;
  isDeleting: boolean;
  itemType?: string; // e.g., "budget item", "bid package", "file"
}

export function BulkActionBar({ 
  selectedCount, 
  onBulkDelete, 
  isDeleting,
  itemType = "item"
}: BulkActionBarProps) {
  if (selectedCount === 0) {
    return null;
  }

  const getSelectionText = () => {
    return `${selectedCount} ${itemType}${selectedCount > 1 ? 's' : ''} selected`;
  };

  return (
    <div className="flex items-center justify-between bg-blue-50 p-4 rounded-lg mb-4">
      <span className="text-blue-800 font-medium">
        {getSelectionText()}
      </span>
      <DeleteButton
        onDelete={onBulkDelete}
        title="Delete Selected"
        description={`Are you sure you want to delete the selected ${itemType}${selectedCount > 1 ? 's' : ''}? This action cannot be undone.`}
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
