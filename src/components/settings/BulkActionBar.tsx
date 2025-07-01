
import React from 'react';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';

interface BulkActionBarProps {
  selectedCount: number;
  onBulkDelete: () => void;
  label: string;
}

export function BulkActionBar({ selectedCount, onBulkDelete, label }: BulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <Button
      variant="destructive"
      size="sm"
      onClick={onBulkDelete}
    >
      <Trash2 className="h-4 w-4 mr-2" />
      Delete Selected ({selectedCount})
    </Button>
  );
}
