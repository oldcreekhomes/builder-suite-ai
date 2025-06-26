
import { TableCell } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { getProgressColor } from "./TaskRowStyles";

interface ProgressCellProps {
  progress: number;
}

export function ProgressCell({ progress }: ProgressCellProps) {
  return (
    <TableCell className="py-1 w-16">
      <div className="flex items-center space-x-2">
        <div className="flex-1">
          <Progress 
            value={progress} 
            className={`h-1 ${getProgressColor(progress)}`}
          />
        </div>
        <span className="text-xs font-medium text-slate-600 w-8">
          {progress}%
        </span>
      </div>
    </TableCell>
  );
}
