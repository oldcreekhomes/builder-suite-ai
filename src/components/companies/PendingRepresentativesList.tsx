import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PendingRepresentative } from "./InlineRepresentativeForm";

interface PendingRepresentativesListProps {
  representatives: PendingRepresentative[];
  onRemove: (id: string) => void;
}

export function PendingRepresentativesList({ representatives, onRemove }: PendingRepresentativesListProps) {
  if (representatives.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Added Representatives ({representatives.length})</p>
      {representatives.map((rep) => (
        <div
          key={rep.id}
          className="flex items-center justify-between p-3 border rounded-lg bg-background"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">
                {rep.first_name} {rep.last_name || ""}
              </span>
              <span className="text-xs text-muted-foreground">- {rep.title}</span>
            </div>
            <p className="text-xs text-muted-foreground truncate">{rep.email}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => onRemove(rep.id)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}
