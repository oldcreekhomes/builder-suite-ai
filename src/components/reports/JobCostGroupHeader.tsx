import { TableRow, TableCell } from "@/components/ui/table";
import { ChevronRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

interface JobCostGroupHeaderProps {
  group: string;
  groupName?: string;
  isExpanded: boolean;
  onToggle: () => void;
}

export function JobCostGroupHeader({
  group,
  groupName,
  isExpanded,
  onToggle,
}: JobCostGroupHeaderProps) {
  return (
    <TableRow className="bg-muted/40 hover:bg-muted/60 border-b">
      <TableCell colSpan={5} className="py-3 px-3 font-semibold">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="h-6 w-6 p-0"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
          <span>{group}</span>
          {groupName && <span className="uppercase">{groupName}</span>}
        </div>
      </TableCell>
    </TableRow>
  );
}
