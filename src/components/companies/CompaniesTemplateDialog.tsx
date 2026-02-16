import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface CompaniesTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportExcel: () => void;
  onAddManually: () => void;
}

export function CompaniesTemplateDialog({
  open,
  onOpenChange,
  onImportExcel,
  onAddManually,
}: CompaniesTemplateDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="text-xl">Add Your Companies</DialogTitle>
          <DialogDescription className="text-base text-muted-foreground">
            Your subcontractors, vendors, and suppliers are the backbone of your projects. Choose how you'd like to get started:
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              Save time by importing all your companies at once from an Excel spreadsheet. The template includes:
            </p>
            <ul className="text-sm text-muted-foreground space-y-1.5 ml-1">
              {[
                'Company details and addresses',
                'Representative contacts',
                'Cost code associations',
                'Ready to bid and schedule',
              ].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              onClick={onImportExcel}
              className="w-full border-foreground"
            >
              Import from Excel
            </Button>
            <Button
              variant="outline"
              onClick={onAddManually}
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
