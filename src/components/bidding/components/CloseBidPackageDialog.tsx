import React from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

interface CloseBidPackageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  costCodeName: string;
  onJustClose: () => void;
  onCreatePO: () => void;
}

export function CloseBidPackageDialog({
  open,
  onOpenChange,
  costCodeName,
  onJustClose,
  onCreatePO,
}: CloseBidPackageDialogProps) {
  const handleJustClose = () => {
    onJustClose();
    onOpenChange(false);
  };

  const handleCreatePO = () => {
    onCreatePO();
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Close Bid Package</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <span className="block">
              How would you like to close <strong>{costCodeName}</strong>?
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="sm:mr-auto"
          >
            Cancel
          </Button>
          <Button
            variant="secondary"
            onClick={handleJustClose}
          >
            Just Close
          </Button>
          <Button
            onClick={handleCreatePO}
          >
            Create PO
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
