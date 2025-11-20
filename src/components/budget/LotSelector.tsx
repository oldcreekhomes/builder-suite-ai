import { useEffect, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectSeparator,
} from "@/components/ui/select";
import { useLots } from "@/hooks/useLots";
import { useLotManagement } from "@/hooks/useLotManagement";
import { Skeleton } from "@/components/ui/skeleton";
import { AddLotDialog } from "./AddLotDialog";
import { Plus } from "lucide-react";

interface LotSelectorProps {
  projectId: string;
}

export function LotSelector({ projectId }: LotSelectorProps) {
  const { lots, isLoading, initializeLots, createLot } = useLots(projectId);
  const { selectedLotId, selectLot } = useLotManagement(projectId);
  const [showAddDialog, setShowAddDialog] = useState(false);

  const nextLotNumber = lots.length > 0 
    ? Math.max(...lots.map(l => l.lot_number)) + 1 
    : 1;

  // Auto-initialize lots if project has total_lots but no lot records
  useEffect(() => {
    if (!isLoading && lots.length === 0 && projectId) {
      // Check if project has total_lots set
      initializeLots.mutate(projectId);
    }
  }, [lots.length, isLoading, projectId]);

  // Auto-select first lot if none selected
  useEffect(() => {
    if (lots.length > 0 && !selectedLotId) {
      selectLot(lots[0].id);
    }
  }, [lots, selectedLotId, selectLot]);

  if (isLoading) {
    return <Skeleton className="h-9 w-32" />;
  }

  const handleValueChange = (value: string) => {
    if (value === "add-new") {
      setShowAddDialog(true);
    } else {
      selectLot(value);
    }
  };

  const handleCreateLot = async (lotNumber: number, lotName?: string) => {
    createLot.mutate(
      { projectId, lotNumber, lotName },
      {
        onSuccess: (newLot) => {
          selectLot(newLot.id);
          setShowAddDialog(false);
        },
      }
    );
  };

  if (lots.length === 0) {
    return null;
  }

  return (
    <>
      <Select
        value={selectedLotId || undefined}
        onValueChange={handleValueChange}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select lot..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="add-new">
            <div className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              <span>Add New Lot</span>
            </div>
          </SelectItem>
          <SelectSeparator />
          {lots.map((lot) => (
            <SelectItem key={lot.id} value={lot.id}>
              {lot.lot_name || `Lot ${lot.lot_number}`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <AddLotDialog
        projectId={projectId}
        nextLotNumber={nextLotNumber}
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onCreate={handleCreateLot}
        isCreating={createLot.isPending}
      />
    </>
  );
}
