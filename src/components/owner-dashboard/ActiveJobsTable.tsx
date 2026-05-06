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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const isScheduleStale = (dateString: string | null | undefined): boolean => {
  if (!dateString) return false;
  const publishDate = new Date(dateString);
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  return publishDate < sevenDaysAgo;
};

const statusColors: Record<string, string> = {
  "In Design": "bg-yellow-500/20 text-yellow-700 border-yellow-500/30",
  "Permitting": "bg-blue-500/20 text-blue-700 border-blue-500/30",
  "Under Construction": "bg-orange-500/20 text-orange-700 border-orange-500/30",
};

const statusPriority: Record<string, number> = {
  "Under Construction": 1,
  "Permitting": 2,
  "In Design": 3,
};

type TabKey = "all" | "Under Construction" | "Permitting" | "In Design";

export function ActiveJobsTable() {
  const navigate = useNavigate();
  const { data: projects = [] } = useProjects();
  const { updateDisplayOrder } = useProjectDisplayOrder();
  const [activeTab, setActiveTab] = useState<TabKey>("Under Construction");
  const [isReorderEnabled, setIsReorderEnabled] = useState(false);
  const [draggedProjectId, setDraggedProjectId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | null>(null);
  const dragRowRef = useRef<HTMLTableRowElement | null>(null);

  const activeProjects = projects.filter(
    p => p.status !== "Completed" && p.status !== "Template" && p.status !== "Permanently Closed"
  );
  const projectIds = activeProjects.map(p => p.id);

  const { data: scheduleProgress = {} } = useProjectScheduleProgress(projectIds);
  const { data: billCounts = {} } = useBillCountsByProject(projectIds);

  const counts = {
    all: activeProjects.length,
    "Under Construction": activeProjects.filter(p => (p.status || "In Design") === "Under Construction").length,
    "Permitting": activeProjects.filter(p => (p.status || "In Design") === "Permitting").length,
    "In Design": activeProjects.filter(p => (p.status || "In Design") === "In Design").length,
  };

  const isAll = activeTab === "all";
  const filtered = isAll
    ? [...activeProjects].sort((a, b) => {
        const pa = statusPriority[a.status || "In Design"] || 4;
        const pb = statusPriority[b.status || "In Design"] || 4;
        if (pa !== pb) return pa - pb;
        return (a.display_order ?? 999) - (b.display_order ?? 999);
      })
    : activeProjects
        .filter(p => (p.status || "In Design") === activeTab)
        .sort((a, b) => (a.display_order ?? 999) - (b.display_order ?? 999));

  const reorderAllowed = !isAll;
  const showStatusColumn = isAll;
  const baseCols = showStatusColumn ? 6 : 5;
  const colCount = isReorderEnabled && reorderAllowed ? baseCols + 1 : baseCols;

  const handleDragStart = (e: React.DragEvent, projectId: string) => {
    if (!isReorderEnabled || !reorderAllowed) return;
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
    if (!isReorderEnabled || !reorderAllowed || !draggedProjectId || draggedProjectId === projectId) return;
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
    if (!isReorderEnabled || !reorderAllowed || !draggedProjectId || draggedProjectId === targetProjectId) return;

    const draggedIndex = filtered.findIndex(p => p.id === draggedProjectId);
    const targetIndex = filtered.findIndex(p => p.id === targetProjectId);
    if (draggedIndex === -1 || targetIndex === -1) return;

    const newOrder = [...filtered];
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

  return (
    <div className="rounded-lg border bg-card">
      <div className="p-4 border-b flex items-center justify-between gap-4 flex-wrap">
        <h3 className="text-lg font-semibold">Active Jobs</h3>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabKey)}>
          <TabsList>
            <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
            <TabsTrigger value="Under Construction">Under Construction ({counts["Under Construction"]})</TabsTrigger>
            <TabsTrigger value="Permitting">Permitting ({counts.Permitting})</TabsTrigger>
            <TabsTrigger value="In Design">In Design ({counts["In Design"]})</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Reorder</span>
          <Switch
            checked={isReorderEnabled}
            onCheckedChange={setIsReorderEnabled}
            disabled={!reorderAllowed}
          />
        </div>
      </div>
      {isReorderEnabled && !reorderAllowed && (
        <div className="px-4 py-2 text-xs text-muted-foreground border-b bg-muted/30">
          Switch to a status tab to reorder.
        </div>
      )}
      <Table>
        <TableHeader>
          <TableRow>
            {isReorderEnabled && reorderAllowed && <TableHead className="w-10"></TableHead>}
            <TableHead>Address</TableHead>
            {showStatusColumn && <TableHead>Status</TableHead>}
            <TableHead>Manager</TableHead>
            <TableHead>Schedule Progress</TableHead>
            <TableHead className="text-center">Bills</TableHead>
            <TableHead>Schedule Update</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 ? (
            <TableRow>
              <TableCell colSpan={colCount} className="text-center text-muted-foreground py-8">
                No projects in this view
              </TableCell>
            </TableRow>
          ) : (
            filtered.map((project) => {
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
                  onClick={() => !(isReorderEnabled && reorderAllowed) && handleRowClick(project.id)}
                  draggable={isReorderEnabled && reorderAllowed}
                  onDragStart={(e) => handleDragStart(e, project.id)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => handleDragOver(e, project.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, project.id)}
                >
                  {isReorderEnabled && reorderAllowed && (
                    <TableCell className="w-10 cursor-grab active:cursor-grabbing">
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                    </TableCell>
                  )}
                  <TableCell className="font-medium">
                    {project.address ? project.address.split(',')[0].trim() : "No address"}
                  </TableCell>
                  {showStatusColumn && (
                    <TableCell>
                      <Badge variant="outline" className={statusColors[project.status || "In Design"]}>
                        {project.status || "In Design"}
                      </Badge>
                    </TableCell>
                  )}
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
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
