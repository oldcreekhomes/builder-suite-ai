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
import { Plus, Check, X } from "lucide-react";
import { TableRowActions } from "@/components/ui/table-row-actions";

export interface LocalLot {
  tempId: string;
  lot_number: number;
  lot_name?: string;
}

interface Props {
  lots: LocalLot[];
  onChange: (lots: LocalLot[]) => void;
}

export function LocalLotManagementSection({ lots, onChange }: Props) {
  const [isAdding, setIsAdding] = useState(false);
  const [newLotName, setNewLotName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<LocalLot | null>(null);

  const nextLotNumber =
    lots.length > 0 ? Math.max(...lots.map((l) => l.lot_number)) + 1 : 1;

  const handleAdd = () => {
    const lot: LocalLot = {
      tempId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      lot_number: nextLotNumber,
      lot_name: newLotName.trim() || undefined,
    };
    onChange([...lots, lot]);
    setIsAdding(false);
    setNewLotName("");
  };

  const handleUpdate = (id: string) => {
    onChange(
      lots.map((l) =>
        l.tempId === id ? { ...l, lot_name: editingName.trim() || undefined } : l
      )
    );
    setEditingId(null);
    setEditingName("");
  };

  const handleDelete = () => {
    if (!deleteConfirm) return;
    onChange(lots.filter((l) => l.tempId !== deleteConfirm.tempId));
    setDeleteConfirm(null);
  };

  const startEditing = (lot: LocalLot) => {
    setEditingId(lot.tempId);
    setEditingName(lot.lot_name || "");
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingName("");
  };

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

      <div className="border rounded-md max-h-[240px] overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name / Address</TableHead>
              <TableHead className="w-20 text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lots.length === 0 && !isAdding ? (
              <TableRow>
                <TableCell colSpan={2} className="text-center text-muted-foreground">
                  No lots created yet
                </TableCell>
              </TableRow>
            ) : (
              <>
                {lots.map((lot) => (
                  <TableRow key={lot.tempId} className="h-8">
                    <TableCell className="py-1.5">
                      {editingId === lot.tempId ? (
                        <Input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          placeholder="Enter lot name/address"
                          className="h-7 text-sm"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleUpdate(lot.tempId);
                            if (e.key === "Escape") cancelEditing();
                          }}
                        />
                      ) : (
                        <span className="text-sm">
                          {lot.lot_name || `Lot ${lot.lot_number}`}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="py-1.5 text-center">
                      {editingId === lot.tempId ? (
                        <div className="flex justify-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleUpdate(lot.tempId)}
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
                        <TableRowActions
                          actions={[
                            { label: "Edit", onClick: () => startEditing(lot) },
                            {
                              label: "Delete Lot",
                              onClick: () => setDeleteConfirm(lot),
                              variant: "destructive",
                              requiresConfirmation: false,
                            },
                          ]}
                        />
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
                          if (e.key === "Enter") handleAdd();
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
                          onClick={handleAdd}
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

      <AlertDialog open={!!deleteConfirm} onOpenChange={(o) => !o && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {deleteConfirm?.lot_name || `Lot ${deleteConfirm?.lot_number}`}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this lot?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
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
