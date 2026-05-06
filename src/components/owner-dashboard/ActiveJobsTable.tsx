import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useProjects } from "@/hooks/useProjects";
import { useProjectScheduleProgress } from "@/hooks/useProjectScheduleProgress";
import { useBillCountsByProject } from "@/hooks/useBillCountsByProject";
import { useProjectDisplayOrder } from "@/hooks/useProjectDisplayOrder";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

// Check if schedule publish date is more than 7 days old
const isScheduleStale = (dateString: string | null | undefined): boolean => {
  if (!dateString) return false;
  const publishDate = new Date(dateString);
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  return publishDate < sevenDaysAgo;
};

const STATUS_GROUPS: Array<{ key: string; label: string }> = [
  { key: "Under Construction", label: "Under Construction" },
  { key: "Permitting", label: "Permitting" },
  { key: "In Design", label: "In Design" },
];

const groupAccent: Record<string, string> = {
  "Under Construction": "border-l-orange-500",
  "Permitting": "border-l-blue-500",
  "In Design": "border-l-yellow-500",
};

export function ActiveJobsTable() {
  const navigate = useNavigate();
  const { data: projects = [] } = useProjects();
  const { updateDisplayOrder } = useProjectDisplayOrder();
  const [isReorderEnabled, setIsReorderEnabled] = useState(false);
  const [draggedProjectId, setDraggedProjectId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | null>(null);
  const dragRowRef = useRef<HTMLTableRowElement | null>(null);

  // Filter to active projects only
  const activeProjects = projects.filter(
    p => p.status !== "Completed" && p.status !== "Template" && p.status !== "Permanently Closed"
  );
  const projectIds = activeProjects.map(p => p.id);

  const { data: scheduleProgress = {} } = useProjectScheduleProgress(projectIds);
  const { data: billCounts = {} } = useBillCountsByProject(projectIds);

  // Build groups: status -> sorted projects
  const groups = STATUS_GROUPS.map(g => {
    const items = activeProjects
      .filter(p => (p.status || "In Design") === g.key)
      .sort((a, b) => (a.display_order ?? 999) - (b.display_order ?? 999));
    return { ...g, items };
  });

  const colCount = isReorderEnabled ? 6 : 5;

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, projectId: string) => {
    if (!isReorderEnabled) return;
    setDraggedProjectId(projectId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', projectId);
    if (e.currentTarget instanceof HTMLElement) {
      dragRowRef.current = e.currentTarget as HTMLTableRowElement;
      setTimeout(() => {
        if (dragRowRef.current) dragRowRef.current.style.opacity = '0.5';
      }, 0);
    }
  };

  const handleDragEnd = () => {
    if (dragRowRef.current) dragRowRef.current.style.opacity = '1';
    setDraggedProjectId(null);
    setDropTargetId(null);
    setDropPosition(null);
    dragRowRef.current = null;
  };

  const handleDragOver = (e: React.DragEvent, projectId: string) => {
    if (!isReorderEnabled || !draggedProjectId || draggedProjectId === projectId) return;
    // Only allow drop within the same status group
    const dragged = activeProjects.find(p => p.id === draggedProjectId);
    const target = activeProjects.find(p => p.id === projectId);
    if (!dragged || !target || (dragged.status || "In Design") !== (target.status || "In Design")) return;

    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    setDropTargetId(projectId);
    setDropPosition(e.clientY < midY ? 'before' : 'after');
  };

  const handleDragLeave = () => {
    setDropTargetId(null);
    setDropPosition(null);
  };

  const handleDrop = async (e: React.DragEvent, targetProjectId: string) => {
    e.preventDefault();
    if (!isReorderEnabled || !draggedProjectId || draggedProjectId === targetProjectId) return;

    const dragged = activeProjects.find(p => p.id === draggedProjectId);
    const target = activeProjects.find(p => p.id === targetProjectId);
    if (!dragged || !target) return;
    const groupKey = dragged.status || "In Design";
    if (groupKey !== (target.status || "In Design")) return;

    const groupItems = groups.find(g => g.key === groupKey)?.items || [];
    const draggedIndex = groupItems.findIndex(p => p.id === draggedProjectId);
    const targetIndex = groupItems.findIndex(p => p.id === targetProjectId);
    if (draggedIndex === -1 || targetIndex === -1) return;

    const newOrder = [...groupItems];
    const [item] = newOrder.splice(draggedIndex, 1);
    let insertIndex = targetIndex;
    if (dropPosition === 'after') {
      insertIndex = draggedIndex < targetIndex ? targetIndex : targetIndex + 1;
    } else {
      insertIndex = draggedIndex < targetIndex ? targetIndex - 1 : targetIndex;
    }
    newOrder.splice(insertIndex, 0, item);

    const updates = newOrder.map((project, index) => ({
      id: project.id,
      display_order: index + 1,
    }));

    await updateDisplayOrder.mutateAsync(updates);
    handleDragEnd();
  };

  const handleRowClick = (projectId: string) => {
    navigate(`/project/${projectId}`);
  };

  const renderProjectRow = (project: typeof activeProjects[number]) => {
    const progress = scheduleProgress[project.id];
    const bills = billCounts[project.id];
    const reviewCount = (bills?.currentCount || 0) + (bills?.lateCount || 0);
    const payCount = bills?.payCount || 0;
    const isDragging = draggedProjectId === project.id;
    const isDropTarget = dropTargetId === project.id;

    return (
      <TableRow
        key={project.id}
        className={cn(
          "cursor-pointer hover:bg-muted/50 transition-all",
          isDragging && "opacity-50",
          isDropTarget && dropPosition === 'before' && "border-t-2 border-t-primary",
          isDropTarget && dropPosition === 'after' && "border-b-2 border-b-primary"
        )}
        onClick={() => !isReorderEnabled && handleRowClick(project.id)}
        draggable={isReorderEnabled}
        onDragStart={(e) => handleDragStart(e, project.id)}
        onDragEnd={handleDragEnd}
        onDragOver={(e) => handleDragOver(e, project.id)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, project.id)}
      >
        {isReorderEnabled && (
          <TableCell className="w-10 cursor-grab active:cursor-grabbing">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </TableCell>
        )}
        <TableCell className="font-medium">
          {project.address ? project.address.split(',')[0].trim() : "No address"}
        </TableCell>
        <TableCell className="text-muted-foreground">
          {project.construction_manager_user
            ? `${project.construction_manager_user.first_name} ${project.construction_manager_user.last_name}`.trim() || "-"
            : "-"}
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2 min-w-[120px]">
            <Progress value={progress?.overallProgress || 0} className="h-2 flex-1" />
            <span className="text-sm text-muted-foreground w-10">
              {progress?.overallProgress || 0}%
            </span>
          </div>
        </TableCell>
        <TableCell className="text-center">
          {reviewCount === 0 && payCount === 0 ? (
            <span className="text-muted-foreground">—</span>
          ) : (
            <span className="inline-flex items-center justify-center rounded-md bg-muted px-2 py-0.5 text-sm font-medium tabular-nums">
              {reviewCount} / {payCount}
            </span>
          )}
        </TableCell>
        <TableCell className={cn(
          project.last_schedule_published_at
            ? isScheduleStale(project.last_schedule_published_at)
              ? "text-red-500 font-medium"
              : "text-muted-foreground"
            : "text-muted-foreground"
        )}>
          {project.last_schedule_published_at
            ? format(new Date(project.last_schedule_published_at), "MMM dd, yyyy")
            : "-"}
        </TableCell>
      </TableRow>
    );
  };

  return (
    <div className="rounded-lg border bg-card">
      <div className="p-4 border-b flex items-center justify-between">
        <h3 className="text-lg font-semibold">Active Jobs</h3>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Reorder</span>
          <Switch checked={isReorderEnabled} onCheckedChange={setIsReorderEnabled} />
        </div>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            {isReorderEnabled && <TableHead className="w-10"></TableHead>}
            <TableHead>Address</TableHead>
            <TableHead>Manager</TableHead>
            <TableHead>Schedule Progress</TableHead>
            <TableHead className="text-center">Bills</TableHead>
            <TableHead>Schedule Update</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {activeProjects.length === 0 ? (
            <TableRow>
              <TableCell colSpan={colCount} className="text-center text-muted-foreground py-8">
                No active projects
              </TableCell>
            </TableRow>
          ) : (
            groups.map(group => {
              if (group.items.length === 0) return null;
              return (
                <>
                  <TableRow key={`group-${group.key}`} className="hover:bg-transparent">
                    <TableCell
                      colSpan={colCount}
                      className={cn(
                        "bg-muted/50 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground border-l-4",
                        groupAccent[group.key]
                      )}
                    >
                      {group.label} ({group.items.length})
                    </TableCell>
                  </TableRow>
                  {group.items.map(renderProjectRow)}
                </>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
