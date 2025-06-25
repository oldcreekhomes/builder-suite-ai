
import { TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";

interface GanttHeaderProps {
  selectedTasks: Set<string>;
  allTaskIds: string[];
  onSelectAll: (checked: boolean) => void;
  columnType: "checkbox" | "code" | "name" | "startDate" | "duration" | "endDate" | "progress";
}

export function GanttHeader({ selectedTasks, allTaskIds, onSelectAll, columnType }: GanttHeaderProps) {
  const isAllSelected = allTaskIds.length > 0 && selectedTasks.size === allTaskIds.length;
  const isIndeterminate = selectedTasks.size > 0 && selectedTasks.size < allTaskIds.length;

  const renderColumn = () => {
    switch (columnType) {
      case "checkbox":
        return (
          <TableHead className="py-0.5 text-xs font-bold text-slate-700 w-8">
            <Checkbox
              checked={isAllSelected}
              onCheckedChange={onSelectAll}
              className="h-3 w-3"
            />
          </TableHead>
        );
      case "code":
        return <TableHead className="py-0.5 text-xs font-bold text-slate-700 w-16">Code</TableHead>;
      case "name":
        return <TableHead className="py-0.5 text-xs font-bold text-slate-700 min-w-[120px] pr-1">Name</TableHead>;
      case "startDate":
        return <TableHead className="py-0.5 text-xs font-bold text-slate-700 w-20 pl-1">Start Date</TableHead>;
      case "duration":
        return <TableHead className="py-0.5 text-xs font-bold text-slate-700 w-16">Duration</TableHead>;
      case "endDate":
        return <TableHead className="py-0.5 text-xs font-bold text-slate-700 w-20">End Date</TableHead>;
      case "progress":
        return <TableHead className="py-0.5 text-xs font-bold text-slate-700 w-16">Progress</TableHead>;
      default:
        return null;
    }
  };

  return (
    <TableHeader>
      <TableRow className="h-3 bg-slate-50 border-b border-slate-200">
        {renderColumn()}
      </TableRow>
    </TableHeader>
  );
}
