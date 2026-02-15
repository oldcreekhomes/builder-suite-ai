import React, { useState } from 'react';
import { ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface CostCodeTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUseTemplate: () => Promise<void>;
  onImportExcel: () => void;
}

export function CostCodeTemplateDialog({
  open,
  onOpenChange,
  onUseTemplate,
  onImportExcel,
}: CostCodeTemplateDialogProps) {
  const [importing, setImporting] = useState(false);

  const handleUseTemplate = async () => {
    setImporting(true);
    try {
      await onUseTemplate();
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={importing ? undefined : onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="text-xl">Set Up Your Cost Codes</DialogTitle>
          <DialogDescription className="text-base text-muted-foreground">
            Get started in seconds, not hours
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          <p className="text-sm text-muted-foreground">
            Cost codes are the foundation of your project budgets, bidding, and accounting.
            Choose how you'd like to get started:
          </p>

          {/* Option 1: Use Template */}
          <div className="rounded-lg border-2 border-foreground bg-muted/30 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Recommended
              </span>
            </div>
            <h3 className="font-semibold text-base">Use Our Template</h3>
            <p className="text-sm text-muted-foreground">
              Import our professionally curated library of ~300 cost codes, pre-configured and ready to go. Everything is automatically populated:
            </p>
            <ul className="text-sm text-muted-foreground space-y-1.5 ml-1">
              {['Cost codes & categories', 'Specifications', 'Bidding settings', 'Subcategories', 'Estimates'].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-foreground shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <Button
              onClick={handleUseTemplate}
              disabled={importing}
              className="w-full bg-foreground text-background hover:bg-foreground/80 h-11 text-sm font-medium"
            >
              {importing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  Use Our Template
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              You can edit, add, or remove any cost code at any time. Once imported, these become entirely yours.
            </p>
          </div>

          {/* Option 2 & 3 */}
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              onClick={onImportExcel}
              disabled={importing}
              className="w-full"
            >
              Import from Excel
            </Button>
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={importing}
              className="w-full text-muted-foreground"
            >
              I'll add them manually
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
