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
import { Archive } from "lucide-react";

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
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5 text-muted-foreground" />
            Archive Company
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              Are you sure you want to archive <strong>{companyName}</strong>?
            </p>
            <div className="rounded-md bg-muted p-3 text-sm">
              <p className="font-medium mb-2">This company has:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>{representativesCount} representative(s)</li>
                <li>{costCodesCount} cost code(s) linked</li>
              </ul>
            </div>
            <p className="text-sm">
              The company and all related data will be archived, not permanently deleted. 
              You can restore it later if needed.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isPending}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {isPending ? "Archiving..." : "Archive Company"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
