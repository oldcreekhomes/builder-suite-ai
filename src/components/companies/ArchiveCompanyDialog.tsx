import { useState, useEffect } from "react";
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
import { Input } from "@/components/ui/input";
import { AlertTriangle } from "lucide-react";

interface ArchiveCompanyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyName: string;
  representativesCount: number;
  costCodesCount: number;
  onConfirm: () => void;
  isPending: boolean;
}

export function ArchiveCompanyDialog({
  open,
  onOpenChange,
  companyName,
  representativesCount,
  costCodesCount,
  onConfirm,
  isPending,
}: ArchiveCompanyDialogProps) {
  const [confirmationText, setConfirmationText] = useState("");
  
  const isConfirmEnabled = confirmationText === companyName;

  // Reset confirmation text when dialog closes
  useEffect(() => {
    if (!open) {
      setConfirmationText("");
    }
  }, [open]);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
            </div>
            <span>Warning: Archive Company</span>
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4 pt-2">
              <p className="text-sm">
                You are about to archive:
              </p>
              <p className="text-base font-semibold text-foreground">
                "{companyName}"
              </p>
              
              <div className="rounded-md bg-amber-50 border border-amber-200 p-3">
                <p className="font-medium text-amber-800 mb-2">This will affect:</p>
                <ul className="list-disc list-inside space-y-1 text-amber-700 text-sm">
                  <li><span className="font-semibold">{representativesCount}</span> representative(s)</li>
                  <li><span className="font-semibold">{costCodesCount}</span> linked cost code(s)</li>
                </ul>
              </div>
              
              <p className="text-sm text-muted-foreground">
                This action will hide the company from all active views. It can be restored later if needed.
              </p>
              
              <div className="pt-2">
                <p className="text-sm font-medium mb-2">
                  To confirm, type <span className="font-bold text-foreground">"{companyName}"</span>:
                </p>
                <Input
                  value={confirmationText}
                  onChange={(e) => setConfirmationText(e.target.value)}
                  placeholder="Enter company name to confirm"
                  className="w-full"
                  autoComplete="off"
                />
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="pt-4">
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={!isConfirmEnabled || isPending}
            className="bg-orange-600 hover:bg-orange-700 disabled:bg-muted disabled:text-muted-foreground"
          >
            {isPending ? "Archiving..." : "Yes, Archive Company"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
