
import { TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight } from "lucide-react";
import { getTaskNumber } from "../utils/ganttUtils";

interface CodeCellProps {
  taskCode: string;
  isChild: boolean;
  hasChildren: boolean;
  isCollapsed: boolean;
  onToggleCollapse?: () => void;
}

export function CodeCell({ 
  taskCode, 
  isChild, 
  hasChildren, 
  isCollapsed, 
  onToggleCollapse 
}: CodeCellProps) {
  return (
    <TableCell className="font-mono text-xs text-slate-600 py-1 relative">
      <div className="flex items-center">
        {!isChild && hasChildren && (
          <Button
            variant="ghost"
            size="sm"
            className="h-3 w-3 p-0 mr-1 hover:bg-slate-200 absolute left-0"
            onClick={onToggleCollapse}
          >
            {isCollapsed ? (
              <ChevronRight className="h-2 w-2" />
            ) : (
              <ChevronDown className="h-2 w-2" />
            )}
          </Button>
        )}
        <span className="px-1 py-0.25 rounded text-xs font-medium ml-4 text-black">
          {getTaskNumber(taskCode)}
        </span>
      </div>
    </TableCell>
  );
}
