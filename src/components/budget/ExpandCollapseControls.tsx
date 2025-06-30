
import React from 'react';
import { Button } from '@/components/ui/button';

interface ExpandCollapseControlsProps {
  onExpandAll: () => void;
  onCollapseAll: () => void;
}

export function ExpandCollapseControls({ onExpandAll, onCollapseAll }: ExpandCollapseControlsProps) {
  return (
    <div className="space-y-2 mb-4">
      <Button
        variant="outline"
        size="sm"
        onClick={onExpandAll}
      >
        Expand All
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={onCollapseAll}
        className="ml-2"
      >
        Collapse All
      </Button>
    </div>
  );
}
