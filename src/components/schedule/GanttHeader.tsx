
import { TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function GanttHeader() {
  return (
    <TableHeader>
      <TableRow className="h-6 bg-slate-50 border-b border-slate-200">
        <TableHead className="py-1 text-xs font-bold text-slate-700 w-16">Code</TableHead>
        <TableHead className="py-1 text-xs font-bold text-slate-700 min-w-[120px] pr-1">Name</TableHead>
        <TableHead className="py-1 text-xs font-bold text-slate-700 w-20 pl-1">Start Date</TableHead>
        <TableHead className="py-1 text-xs font-bold text-slate-700 w-16">Duration</TableHead>
        <TableHead className="py-1 text-xs font-bold text-slate-700 w-20">End Date</TableHead>
        <TableHead className="py-1 text-xs font-bold text-slate-700 w-16">Progress</TableHead>
      </TableRow>
    </TableHeader>
  );
}
