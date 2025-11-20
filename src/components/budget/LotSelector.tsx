import { useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLots } from "@/hooks/useLots";
import { useLotManagement } from "@/hooks/useLotManagement";
import { Skeleton } from "@/components/ui/skeleton";

interface LotSelectorProps {
  projectId: string;
}

export function LotSelector({ projectId }: LotSelectorProps) {
  const { lots, isLoading, initializeLots } = useLots(projectId);
  const { selectedLotId, selectLot } = useLotManagement(projectId);

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

  if (lots.length === 0) {
    return null;
  }

  return (
    <Select
      value={selectedLotId || undefined}
      onValueChange={selectLot}
    >
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Select lot..." />
      </SelectTrigger>
      <SelectContent>
        {lots.map((lot) => (
          <SelectItem key={lot.id} value={lot.id}>
            {lot.lot_name || `Lot ${lot.lot_number}`}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
