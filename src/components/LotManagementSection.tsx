import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { useLots, ProjectLot } from "@/hooks/useLots";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface LotManagementSectionProps {
  projectId: string;
}

export function LotManagementSection({ projectId }: LotManagementSectionProps) {
  const { lots, isLoading, createLot, updateLot, deleteLot } = useLots(projectId);
  const [isAdding, setIsAdding] = useState(false);
  const [newLotName, setNewLotName] = useState("");
  const [editingLotId, setEditingLotId] = useState<string | null>(null);
  const [editingLotName, setEditingLotName] = useState("");
  const [deleteConfirmLot, setDeleteConfirmLot] = useState<ProjectLot | null>(null);

  // Query to get affected counts for deletion warning
  const { data: affectedCounts } = useQuery({
    queryKey: ['lot-affected-counts', deleteConfirmLot?.id],
    queryFn: async () => {
      if (!deleteConfirmLot) return null;

      const [budgetsResult, posResult, billsResult] = await Promise.all([
        supabase
          .from('project_budgets')
          .select('id', { count: 'exact', head: true })
          .eq('lot_id', deleteConfirmLot.id),
        supabase
          .from('project_purchase_orders')
          .select('id', { count: 'exact', head: true })
          .eq('lot_id', deleteConfirmLot.id),
        supabase
          .from('bills')
          .select('id', { count: 'exact', head: true })
          .eq('lot_id', deleteConfirmLot.id),
      ]);

      return {
        budgets: budgetsResult.count || 0,
        purchaseOrders: posResult.count || 0,
        bills: billsResult.count || 0,
      };
    },
    enabled: !!deleteConfirmLot,
  });

  const nextLotNumber = lots.length > 0 
    ? Math.max(...lots.map(l => l.lot_number)) + 1 
    : 1;

  const handleAddLot = () => {
    createLot.mutate(
      { projectId, lotNumber: nextLotNumber, lotName: newLotName.trim() || undefined },
      {
        onSuccess: () => {
          setIsAdding(false);
          setNewLotName("");
        },
      }
    );
  };

  const handleUpdateLot = (lotId: string) => {
    updateLot.mutate(
      { lotId, lotName: editingLotName.trim() },
      {
        onSuccess: () => {
          setEditingLotId(null);
          setEditingLotName("");
        },
      }
    );
  };

  const handleDeleteLot = () => {
    if (!deleteConfirmLot) return;
    deleteLot.mutate(deleteConfirmLot.id, {
      onSuccess: () => {
        setDeleteConfirmLot(null);
      },
    });
  };

  const startEditing = (lot: ProjectLot) => {
    setEditingLotId(lot.id);
    setEditingLotName(lot.lot_name || "");
  };

  const cancelEditing = () => {
    setEditingLotId(null);
    setEditingLotName("");
  };

  const hasAffectedItems = affectedCounts && 
    (affectedCounts.budgets > 0 || affectedCounts.purchaseOrders > 0 || affectedCounts.bills > 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Lots / Addresses</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsAdding(true)}
          disabled={isAdding}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Lot
        </Button>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow className="h-8">
              <TableHead className="py-1.5 text-xs">Name / Address</TableHead>
              <TableHead className="w-20 text-right py-1.5 text-xs">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={2} className="text-center text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : lots.length === 0 && !isAdding ? (
              <TableRow>
                <TableCell colSpan={2} className="text-center text-muted-foreground">
                  No lots created yet
                </TableCell>
              </TableRow>
            ) : (
              <>
                {lots.map((lot) => (
                  <TableRow key={lot.id} className="h-8">
                    <TableCell className="py-1.5">
                      {editingLotId === lot.id ? (
                        <Input
                          value={editingLotName}
                          onChange={(e) => setEditingLotName(e.target.value)}
                          placeholder="Enter lot name/address"
                          className="h-7 text-sm"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleUpdateLot(lot.id);
                            if (e.key === "Escape") cancelEditing();
                          }}
                        />
                      ) : (
                        <span className="text-sm">
                          {lot.lot_name || `Lot ${lot.lot_number}`}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="py-1.5 text-right">
                      {editingLotId === lot.id ? (
                        <div className="flex justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleUpdateLot(lot.id)}
                            disabled={updateLot.isPending}
                          >
                            <Check className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={cancelEditing}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => startEditing(lot)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => setDeleteConfirmLot(lot)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {isAdding && (
                  <TableRow className="h-8">
                    <TableCell className="py-1.5">
                      <Input
                        value={newLotName}
                        onChange={(e) => setNewLotName(e.target.value)}
                        placeholder="Enter lot name/address (optional)"
                        className="h-7 text-sm"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleAddLot();
                          if (e.key === "Escape") {
                            setIsAdding(false);
                            setNewLotName("");
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell className="py-1.5 text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={handleAddLot}
                          disabled={createLot.isPending}
                        >
                          <Check className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => {
                            setIsAdding(false);
                            setNewLotName("");
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmLot} onOpenChange={(open) => !open && setDeleteConfirmLot(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteConfirmLot?.lot_name || 'Lot'}?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                {hasAffectedItems ? (
                  <>
                    <p className="text-destructive font-medium">
                      Warning: This lot has associated data that will be affected:
                    </p>
                    <ul className="list-disc list-inside space-y-1">
                      {affectedCounts.budgets > 0 && (
                        <li>{affectedCounts.budgets} budget item(s)</li>
                      )}
                      {affectedCounts.purchaseOrders > 0 && (
                        <li>{affectedCounts.purchaseOrders} purchase order(s)</li>
                      )}
                      {affectedCounts.bills > 0 && (
                        <li>{affectedCounts.bills} bill(s)</li>
                      )}
                    </ul>
                    <p>Deleting this lot will remove the lot assignment from these items.</p>
                  </>
                ) : (
                  <p>Are you sure you want to delete this lot? This action cannot be undone.</p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteLot}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Lot
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
