
import React from 'react';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';

interface BudgetPrintToolbarProps {
  onPrint: () => void;
}

export function BudgetPrintToolbar({ onPrint }: BudgetPrintToolbarProps) {
  return (
    <div className="flex items-center justify-between border-b pb-4 mb-4">
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-semibold">Project Budget</h3>
      </div>
      <div className="flex items-center gap-2">
        <Button onClick={onPrint} variant="outline" size="sm">
          <Printer className="h-4 w-4 mr-2" />
          Print Budget
        </Button>
      </div>
    </div>
  );
}
