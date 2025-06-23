
import React from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

interface BulkActionBarProps {
  selectedCount: number;
  onBulkDelete: () => void;
  isDeleting: boolean;
}

export function BulkActionBar({ selectedCount, onBulkDelete, isDeleting }: BulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="flex items-center justify-between bg-blue-50 p-3 rounded-lg">
      <span className="text-sm text-blue-800">
        {selectedCount} file(s) selected
      </span>
      <Button
        variant="destructive"
        size="sm"
        onClick={onBulkDelete}
        disabled={isDeleting}
      >
        <Trash2 className="h-4 w-4 mr-2" />
        Delete Selected
      </Button>
    </div>
  );
}
