import { useRecurringTransactions, type RecurringTransaction } from "@/hooks/useRecurringTransactions";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PendingRecurringBannerProps {
  onEnterTransaction?: (rt: RecurringTransaction) => void;
  onViewAll?: () => void;
}

export function PendingRecurringBanner({ onEnterTransaction, onViewAll }: PendingRecurringBannerProps) {
  const { dueTransactions } = useRecurringTransactions();

  if (dueTransactions.length === 0) return null;

  return (
    <div className="mx-6 mt-3 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg flex items-center justify-between">
      <div className="flex items-center gap-2">
        <AlertCircle className="h-4 w-4 text-amber-600" />
        <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
          {dueTransactions.length} recurring transaction{dueTransactions.length !== 1 ? "s" : ""} due for entry
        </span>
      </div>
      <Button variant="outline" size="sm" onClick={onViewAll}>
        View All
      </Button>
    </div>
  );
}
