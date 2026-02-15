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

interface ChartOfAccountsTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUseTemplate: () => Promise<void>;
  onImportQuickBooks: () => void;
  onAddManually: () => void;
}

export function ChartOfAccountsTemplateDialog({
  open,
  onOpenChange,
  onUseTemplate,
  onImportQuickBooks,
  onAddManually,
}: ChartOfAccountsTemplateDialogProps) {
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
          <DialogTitle className="text-xl">Set Up Your Chart of Accounts</DialogTitle>
          <DialogDescription className="text-base text-muted-foreground">
            Your chart of accounts is the foundation of your project accounting and financial reporting. Choose how you'd like to get started:
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Option 1: Use Template */}
          <div className="rounded-lg border-2 border-foreground bg-muted/30 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Recommended
              </span>
            </div>
            <h3 className="font-semibold text-base">Use Our Template</h3>
            <p className="text-sm text-muted-foreground">
              Import our professionally curated chart of accounts, pre-configured and ready to go. Everything is automatically populated:
            </p>
            <ul className="text-sm text-muted-foreground space-y-1.5 ml-1">
              {['Account codes & names', 'Account types', 'Descriptions', 'Ready-to-use structure'].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
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
              You can edit, add, or remove any account at any time. Once imported, these become entirely yours.
            </p>
          </div>

          {/* Option 2 & 3 */}
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              onClick={onImportQuickBooks}
              disabled={importing}
              className="w-full border-foreground"
            >
              Import from QuickBooks
            </Button>
            <Button
              variant="outline"
              onClick={onAddManually}
              disabled={importing}
              className="w-full border-foreground text-muted-foreground"
            >
              I'll add them manually
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
