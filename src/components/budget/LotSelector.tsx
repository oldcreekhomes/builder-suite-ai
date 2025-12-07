import { useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLots } from "@/hooks/useLots";
import { Skeleton } from "@/components/ui/skeleton";

interface LotSelectorProps {
  projectId: string;
  selectedLotId: string | null;
  onSelectLot: (lotId: string) => void;
}

export function LotSelector({ projectId, selectedLotId, onSelectLot }: LotSelectorProps) {
  const { lots, isLoading, initializeLots } = useLots(projectId);

  // Auto-initialize lots if project has total_lots but no lot records
  useEffect(() => {
    if (!isLoading && lots.length === 0 && projectId) {
      initializeLots.mutate(projectId);
    }
  }, [lots.length, isLoading, projectId]);

  // Auto-select first lot if none selected
  useEffect(() => {
    if (lots.length > 0 && !selectedLotId) {
      onSelectLot(lots[0].id);
    }
  }, [lots, selectedLotId, onSelectLot]);

  if (isLoading) {
    return <Skeleton className="h-9 w-32" />;
  }

  if (lots.length === 0) {
    return null;
  }

  return (
    <Select
      value={selectedLotId || undefined}
      onValueChange={onSelectLot}
    >
      <SelectTrigger className="w-[200px]">
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
