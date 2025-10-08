import { useState } from "react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Building2, Edit } from "lucide-react";
import { format } from "date-fns";
import { usePendingBills, PendingBill } from "@/hooks/usePendingBills";
import { ApproveBillDialog } from "./ApproveBillDialog";
import { EditExtractedBillDialog } from "./EditExtractedBillDialog";
import { getFileIcon, getFileIconColor } from "@/components/bidding/utils/fileIconUtils";
import { useUniversalFilePreviewContext } from "@/components/files/UniversalFilePreviewProvider";
import { DeleteButton } from "@/components/ui/delete-button";

interface ExtractedData {
  vendor_name?: string;
  [key: string]: any;
}

interface BillsReviewTableRowProps {
  bill: PendingBill;
}

export const BillsReviewTableRow = ({
  bill,
}: BillsReviewTableRowProps) => {
  const { rejectBill, deletePendingUpload } = usePendingBills();
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const { openBillAttachment } = useUniversalFilePreviewContext();

  const extractedData = bill.extracted_data as ExtractedData | null;
  const vendorName = extractedData?.vendor_name;

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
      <TableRow className="hover:bg-muted/50">
        <TableCell>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const displayName = bill.file_name.split('/').pop() || bill.file_name;
                openBillAttachment(bill.file_name, displayName);
              }}
              className={`${getFileIconColor(bill.file_name)} transition-colors p-1`}
              title={bill.file_name}
              type="button"
            >
              {(() => {
                const IconComponent = getFileIcon(bill.file_name);
                return <IconComponent className="h-4 w-4" />;
              })()}
            </button>
            <div className="flex flex-col gap-1">
              <span className="font-medium">{bill.file_name.split('/').pop() || bill.file_name}</span>
              {vendorName && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Building2 className="h-3 w-3" />
                  <span>{vendorName}</span>
                </div>
              )}
            </div>
          </div>
        </TableCell>
        <TableCell>
          <span className="text-sm text-muted-foreground">
            {format(new Date(bill.created_at), 'MMM d, yyyy')}
          </span>
        </TableCell>
        <TableCell>{getStatusBadge(bill.status)}</TableCell>
        <TableCell className="text-right">
          <div className="flex justify-end gap-2">
            {(bill.status === 'completed' || bill.status === 'reviewing') && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setShowEditDialog(true)}
                title="Edit bill"
              >
                <Edit className="h-4 w-4" />
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
            <DeleteButton
              onDelete={async () => {
                await deletePendingUpload.mutateAsync(bill.id);
              }}
              title="Delete Pending Bill"
              description="This will permanently delete this pending bill upload and all associated line items. This action cannot be undone."
              isLoading={deletePendingUpload.isPending}
              size="sm"
            />
          </div>
        </TableCell>
      </TableRow>
      
      <ApproveBillDialog
        open={showApproveDialog}
        onOpenChange={setShowApproveDialog}
        pendingUploadId={bill.id}
      />
      
      <EditExtractedBillDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        pendingUploadId={bill.id}
      />
    </>
  );
};
