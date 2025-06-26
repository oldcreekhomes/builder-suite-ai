
import { TableCell } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";

interface CheckboxCellProps {
  isSelected: boolean;
  onSelectTask: (taskId: string, checked: boolean) => void;
  taskId: string;
}

export function CheckboxCell({ isSelected, onSelectTask, taskId }: CheckboxCellProps) {
  return (
    <TableCell className="py-1 w-8">
      <Checkbox
        checked={isSelected}
        onCheckedChange={(checked) => onSelectTask(taskId, checked as boolean)}
        className="h-3 w-3"
      />
    </TableCell>
  );
}
