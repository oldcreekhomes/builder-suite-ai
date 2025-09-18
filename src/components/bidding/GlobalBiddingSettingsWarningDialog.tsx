import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface GlobalBiddingSettingsWarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function GlobalBiddingSettingsWarningDialog({
  open,
  onOpenChange,
  onConfirm,
  isLoading = false
}: GlobalBiddingSettingsWarningDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-destructive">Apply Global Settings</AlertDialogTitle>
          <AlertDialogDescription className="text-destructive">
            This will update all due dates, reminder dates and files for all draft bid packages. 
            You can't change this. Are you sure?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          >
            {isLoading ? "Applying..." : "Yes, Apply Settings"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}