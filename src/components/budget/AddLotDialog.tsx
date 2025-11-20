import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AddLotDialogProps {
  projectId: string;
  nextLotNumber: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (lotNumber: number, lotName?: string) => void;
  isCreating?: boolean;
}

export function AddLotDialog({
  projectId,
  nextLotNumber,
  open,
  onOpenChange,
  onCreate,
  isCreating = false,
}: AddLotDialogProps) {
  const [lotName, setLotName] = useState("");

  const handleCreate = () => {
    onCreate(nextLotNumber, lotName.trim() || undefined);
    setLotName("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Lot</DialogTitle>
          <DialogDescription>
            Create a new lot for this project. The lot number will be automatically assigned.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="lot-number">Lot Number</Label>
            <Input
              id="lot-number"
              value={`Lot ${nextLotNumber}`}
              disabled
              className="bg-muted"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="lot-name">
              Lot Name/Address <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="lot-name"
              placeholder="e.g., 123 Main Street"
              value={lotName}
              onChange={(e) => setLotName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !isCreating) {
                  handleCreate();
                }
              }}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={isCreating}>
            {isCreating ? "Creating..." : "Create Lot"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
