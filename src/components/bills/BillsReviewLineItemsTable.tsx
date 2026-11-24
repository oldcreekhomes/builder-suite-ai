import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Save } from "lucide-react";
import { usePendingBills, PendingBillLine } from "@/hooks/usePendingBills";
import { AccountSearchInput } from "@/components/AccountSearchInput";
import { CostCodeSearchInput } from "@/components/CostCodeSearchInput";
import { JobSearchInput } from "@/components/JobSearchInput";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { savedBillRate, billTotalChanged } from '@/lib/billEditMath';
import { rowTotal } from '@/lib/billLineMath';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface BillsReviewLineItemsTableProps {
  pendingUploadId: string;
}

export const BillsReviewLineItemsTable = ({
  pendingUploadId,
}: BillsReviewLineItemsTableProps) => {
  const { usePendingBillLines, updateLine, addLine, deleteLine } = usePendingBills();
  const { data: lines, isLoading } = usePendingBillLines(pendingUploadId);
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const [editedLine, setEditedLine] = useState<Partial<PendingBillLine>>({});
  const [confirmAmountChange, setConfirmAmountChange] = useState(false);

  const handleStartEdit = (line: PendingBillLine) => {
    setEditingLineId(line.id);
    setEditedLine({ ...line, unit_cost: savedBillRate(line.amount, line.quantity || 1) });
  };

  const handleSaveEdit = (confirmed = false) => {
    if (editingLineId && editedLine) {
      const original = lines?.find(line => line.id === editingLineId);
      if (original && !confirmed && billTotalChanged(original.amount, [editedLine.amount ?? original.amount])) {
        setConfirmAmountChange(true);
        return;
      }
      updateLine.mutate({
        lineId: editingLineId,
        updates: editedLine,
      });
      setEditingLineId(null);
      setEditedLine({});
    }
  };

  const handleCancelEdit = () => {
    setEditingLineId(null);
    setEditedLine({});
  };

  const [pendingLineDelete, setPendingLineDelete] = useState<string | null>(null);
  const handleDelete = (lineId: string) => setPendingLineDelete(lineId);

  const handleAddLine = () => {
    addLine.mutate({
      pendingUploadId,
      lineData: {
        line_type: 'expense',
        quantity: 1,
        unit_cost: 0,
        amount: 0,
      },
    });
  };

  if (isLoading) {
    return <div>Loading line items...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Line Items</h3>
        <Button size="sm" variant="outline" onClick={handleAddLine}>
          <Plus className="h-4 w-4 mr-1" />
          Add Line
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Type</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Account/Cost Code</TableHead>
            <TableHead>Project</TableHead>
            <TableHead>Qty</TableHead>
            <TableHead>Unit Cost</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead className="text-center">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lines?.map((line) => (
            <TableRow key={line.id}>
              <TableCell>
                {editingLineId === line.id ? (
                  <Select
                    value={editedLine.line_type || line.line_type}
                    onValueChange={(value: 'job_cost' | 'expense') =>
                      setEditedLine({ ...editedLine, line_type: value })
                    }
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="job_cost">Job Cost</SelectItem>
                      <SelectItem value="expense">Expense</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant={line.line_type === 'job_cost' ? 'default' : 'secondary'}>
                    {line.line_type === 'job_cost' ? 'Job Cost' : 'Expense'}
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                {editingLineId === line.id ? (
                  <Input
                    value={editedLine.description || ''}
                    onChange={(e) =>
                      setEditedLine({ ...editedLine, description: e.target.value })
                    }
                    className="h-8"
                  />
                ) : (
                  <span onClick={() => handleStartEdit(line)} className="cursor-pointer">
                    {line.description || '-'}
                  </span>
                )}
              </TableCell>
              <TableCell>
                {editingLineId === line.id ? (
                  line.line_type === 'job_cost' ? (
                    <CostCodeSearchInput
                      value={editedLine.cost_code_id || ''}
                      onChange={(value) =>
                        setEditedLine({ ...editedLine, cost_code_id: value })
                      }
                      onCostCodeSelect={(costCode) =>
                        setEditedLine({ ...editedLine, cost_code_id: costCode.id })
                      }
                      placeholder="Select cost code"
                    />
                  ) : (
                    <AccountSearchInput
                      value={editedLine.account_id || ''}
                      onChange={(accountId) =>
                        setEditedLine({ ...editedLine, account_id: accountId })
                      }
                      placeholder="Select account"
                    />
                  )
                ) : (
                  <span onClick={() => handleStartEdit(line)} className="cursor-pointer">
                    {line.line_type === 'job_cost'
                      ? line.cost_code_name || '-'
                      : line.account_name || '-'}
                  </span>
                )}
              </TableCell>
              <TableCell>
                {editingLineId === line.id ? (
                  <JobSearchInput
                    value={editedLine.project_id || ''}
                    onChange={(projectId) =>
                      setEditedLine({ ...editedLine, project_id: projectId })
                    }
                    placeholder="Select project"
                  />
                ) : (
                  <span onClick={() => handleStartEdit(line)} className="cursor-pointer">
                    {line.project_name || '-'}
                  </span>
                )}
              </TableCell>
              <TableCell>
                {editingLineId === line.id ? (
                  <Input
                    type="number"
                    value={editedLine.quantity ?? line.quantity}
                    onChange={(e) =>
                      setEditedLine({
                        ...editedLine,
                        quantity: parseFloat(e.target.value) || 0,
                        amount: rowTotal(parseFloat(e.target.value) || 0, editedLine.unit_cost || 0),
                      })
                    }
                    className="h-8 w-20"
                  />
                ) : (
                  <span onClick={() => handleStartEdit(line)} className="cursor-pointer">
                    {line.quantity}
                  </span>
                )}
              </TableCell>
              <TableCell>
                {editingLineId === line.id ? (
                  <Input
                    type="number"
                    step="0.01"
                    value={editedLine.unit_cost ?? line.unit_cost}
                    onChange={(e) =>
                      setEditedLine({
                        ...editedLine,
                        unit_cost: parseFloat(e.target.value) || 0,
                        amount: rowTotal(editedLine.quantity || 0, parseFloat(e.target.value) || 0),
                      })
                    }
                    className="h-8 w-24"
                  />
                ) : (
                  <span onClick={() => handleStartEdit(line)} className="cursor-pointer">
                    ${line.unit_cost.toFixed(2)}
                  </span>
                )}
              </TableCell>
              <TableCell>
                {editingLineId === line.id ? (
                  <Input
                    type="number"
                    step="0.01"
                    value={editedLine.amount ?? line.amount}
                    onChange={(e) =>
                      setEditedLine({
                        ...editedLine,
                        amount: parseFloat(e.target.value) || 0,
                        unit_cost: savedBillRate(parseFloat(e.target.value) || 0, editedLine.quantity || 1),
                      })
                    }
                    className="h-8 w-24"
                  />
                ) : (
                  <span
                    onClick={() => handleStartEdit(line)}
                    className="cursor-pointer font-medium"
                  >
                    ${line.amount.toFixed(2)}
                  </span>
                )}
              </TableCell>
              <TableCell className="text-right">
                {editingLineId === line.id ? (
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="ghost" onClick={() => handleSaveEdit()}>
                      <Save className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(line.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {lines && lines.length > 0 && (
        <div className="flex justify-end">
          <div className="text-right space-y-1">
            <div className="text-sm text-muted-foreground">Total Amount:</div>
            <div className="text-2xl font-bold">
              ${lines.reduce((sum, line) => sum + line.amount, 0).toFixed(2)}
            </div>
          </div>
        </div>
      )}
      <AlertDialog open={confirmAmountChange} onOpenChange={setConfirmAmountChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Bill Amount Change</AlertDialogTitle>
            <AlertDialogDescription>
              Line changes from ${Number(lines?.find(line => line.id === editingLineId)?.amount || 0).toFixed(2)} to ${Number(editedLine.amount || 0).toFixed(2)}. Confirm this matches the invoice.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleSaveEdit(true)}>Confirm &amp; Save</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <DeleteConfirmationDialog
        open={!!pendingLineDelete}
        onOpenChange={(o) => { if (!o) setPendingLineDelete(null); }}
        title="Delete this line item?"
        description="Are you sure you want to delete this line item? This can't be undone."
        onConfirm={() => { if (pendingLineDelete) deleteLine.mutate(pendingLineDelete); setPendingLineDelete(null); }}
      />
    </div>
  );
};
