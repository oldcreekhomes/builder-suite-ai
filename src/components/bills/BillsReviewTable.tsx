import { useState } from "react";
import { usePendingBills } from "@/hooks/usePendingBills";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BillsReviewTableRow } from "./BillsReviewTableRow";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";

export const BillsReviewTable = () => {
  const { pendingBills, isLoading } = usePendingBills();
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (billId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(billId)) {
      newExpanded.delete(billId);
    } else {
      newExpanded.add(billId);
    }
    setExpandedRows(newExpanded);
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (!pendingBills || pendingBills.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileText className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Bills to Review</h3>
        <p className="text-sm text-muted-foreground">
          Upload bills using AI extraction to review them here.
        </p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10"></TableHead>
            <TableHead>File Name</TableHead>
            <TableHead>Uploaded</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pendingBills.map((bill) => (
            <BillsReviewTableRow
              key={bill.id}
              bill={bill}
              isExpanded={expandedRows.has(bill.id)}
              onToggle={() => toggleRow(bill.id)}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
