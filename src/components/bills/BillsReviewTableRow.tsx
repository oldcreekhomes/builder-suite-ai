import { useState } from "react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Check, X, FileText, Building2 } from "lucide-react";
import { format } from "date-fns";
import { usePendingBills, PendingBill } from "@/hooks/usePendingBills";
import { BillsReviewLineItemsTable } from "./BillsReviewLineItemsTable";
import { ApproveBillDialog } from "./ApproveBillDialog";

interface ExtractedData {
  vendor_name?: string;
  [key: string]: any;
}

interface BillsReviewTableRowProps {
  bill: PendingBill;
  isExpanded: boolean;
  onToggle: () => void;
}

export const BillsReviewTableRow = ({
  bill,
  isExpanded,
  onToggle,
}: BillsReviewTableRowProps) => {
  const { rejectBill, startReview } = usePendingBills();
  const [showApproveDialog, setShowApproveDialog] = useState(false);

  const extractedData = bill.extracted_data as ExtractedData | null;
  const vendorName = extractedData?.vendor_name;

  const handleStartReview = () => {
    startReview.mutate(bill.id);
    onToggle();
  };

  const handleReject = () => {
    if (confirm('Are you sure you want to reject this bill?')) {
      rejectBill.mutate({ pendingUploadId: bill.id });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="secondary">Ready to Review</Badge>;
      case 'reviewing':
        return <Badge variant="default">In Review</Badge>;
      case 'approved':
        return <Badge className="bg-green-500">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <>
      <TableRow className="cursor-pointer hover:bg-muted/50">
        <TableCell onClick={onToggle}>
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </TableCell>
        <TableCell onClick={onToggle}>
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <div className="flex flex-col gap-1">
              <span className="font-medium">{bill.file_name}</span>
              {vendorName && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Building2 className="h-3 w-3" />
                  <span>{vendorName}</span>
                </div>
              )}
            </div>
          </div>
        </TableCell>
        <TableCell onClick={onToggle}>
          <span className="text-sm text-muted-foreground">
            {format(new Date(bill.created_at), 'MMM d, yyyy')}
          </span>
        </TableCell>
        <TableCell onClick={onToggle}>{getStatusBadge(bill.status)}</TableCell>
        <TableCell className="text-right">
          <div className="flex justify-end gap-2">
            {bill.status === 'completed' && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleStartReview}
              >
                Start Review
              </Button>
            )}
            {bill.status === 'reviewing' && (
              <>
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => setShowApproveDialog(true)}
                >
                  <Check className="h-4 w-4 mr-1" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleReject}
                >
                  <X className="h-4 w-4 mr-1" />
                  Reject
                </Button>
              </>
            )}
          </div>
        </TableCell>
      </TableRow>
      {isExpanded && bill.status === 'reviewing' && (
        <TableRow>
          <TableCell colSpan={5} className="bg-muted/20 p-6">
            <BillsReviewLineItemsTable pendingUploadId={bill.id} />
          </TableCell>
        </TableRow>
      )}
      
      <ApproveBillDialog
        open={showApproveDialog}
        onOpenChange={setShowApproveDialog}
        pendingUploadId={bill.id}
      />
    </>
  );
};
