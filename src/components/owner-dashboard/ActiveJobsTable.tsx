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
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { ArrowUpDown, ArrowUp, ArrowDown, GripVertical } from "lucide-react";
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

const statusColors: Record<string, string> = {
  "In Design": "bg-yellow-500/20 text-yellow-700 border-yellow-500/30",
  "Permitting": "bg-blue-500/20 text-blue-700 border-blue-500/30",
  "Under Construction": "bg-orange-500/20 text-orange-700 border-orange-500/30",
  "Completed": "bg-green-500/20 text-green-700 border-green-500/30",
};

const statusPriority: Record<string, number> = {
  "Under Construction": 1,
  "Permitting": 2,
  "In Design": 3,
};

export function ActiveJobsTable() {
  const navigate = useNavigate();
  const { data: projects = [] } = useProjects();
  const { updateDisplayOrder } = useProjectDisplayOrder();
  const [sortColumn, setSortColumn] = useState<'address' | 'status'>('status');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [isReorderEnabled, setIsReorderEnabled] = useState(false);
  const [draggedProjectId, setDraggedProjectId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | null>(null);
  const dragRowRef = useRef<HTMLTableRowElement | null>(null);
  
  // Filter to active projects only (not completed, not template)
  const activeProjects = projects.filter(p => p.status !== "Completed" && p.status !== "Template");
  const projectIds = activeProjects.map(p => p.id);
  
  // Sort projects - use display_order when reordering is enabled
  const sortedProjects = [...activeProjects].sort((a, b) => {
    if (isReorderEnabled) {
      // When reorder mode is on, use display_order (fallback to status priority)
      const orderA = a.display_order ?? 999;
      const orderB = b.display_order ?? 999;
      if (orderA !== orderB) return orderA - orderB;
      // Fallback to status priority if display_order is the same
      const priorityA = statusPriority[a.status || "In Design"] || 4;
      const priorityB = statusPriority[b.status || "In Design"] || 4;
      return priorityA - priorityB;
    }
    
    if (sortColumn === 'status') {
      const priorityA = statusPriority[a.status || "In Design"] || 4;
      const priorityB = statusPriority[b.status || "In Design"] || 4;
      return sortDirection === 'asc' ? priorityA - priorityB : priorityB - priorityA;
    } else {
      const addressA = (a.address || "").toLowerCase();
      const addressB = (b.address || "").toLowerCase();
      return sortDirection === 'asc' 
        ? addressA.localeCompare(addressB) 
        : addressB.localeCompare(addressA);
    }
  });

  const handleSort = (column: 'address' | 'status') => {
    if (!isReorderEnabled) return; // Only allow sorting when reorder mode is on
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (column: 'address' | 'status') => {
    if (!isReorderEnabled) return null; // Hide sort icons when reorder is off (locked)
    if (sortColumn !== column) return <ArrowUpDown className="h-4 w-4 ml-1" />;
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-4 w-4 ml-1" /> 
      : <ArrowDown className="h-4 w-4 ml-1" />;
  };

  const { data: scheduleProgress = {} } = useProjectScheduleProgress(projectIds);
  const { data: billCounts = {} } = useBillCountsByProject(projectIds);

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, projectId: string) => {
    if (!isReorderEnabled) return;
    setDraggedProjectId(projectId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', projectId);
    // Make row semi-transparent
    if (e.currentTarget instanceof HTMLElement) {
      dragRowRef.current = e.currentTarget as HTMLTableRowElement;
      setTimeout(() => {
        if (dragRowRef.current) {
          dragRowRef.current.style.opacity = '0.5';
        }
      }, 0);
    }
  };

  const handleDragEnd = () => {
    if (dragRowRef.current) {
      dragRowRef.current.style.opacity = '1';
    }
    setDraggedProjectId(null);
    setDropTargetId(null);
    setDropPosition(null);
    dragRowRef.current = null;
  };

  const handleDragOver = (e: React.DragEvent, projectId: string) => {
    if (!isReorderEnabled || !draggedProjectId || draggedProjectId === projectId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    // Determine if dropping before or after based on mouse position
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const position = e.clientY < midY ? 'before' : 'after';
    
    setDropTargetId(projectId);
    setDropPosition(position);
  };

  const handleDragLeave = () => {
    setDropTargetId(null);
    setDropPosition(null);
  };

  const handleDrop = async (e: React.DragEvent, targetProjectId: string) => {
    e.preventDefault();
    if (!isReorderEnabled || !draggedProjectId || draggedProjectId === targetProjectId) return;

    const draggedIndex = sortedProjects.findIndex(p => p.id === draggedProjectId);
    const targetIndex = sortedProjects.findIndex(p => p.id === targetProjectId);
    
    if (draggedIndex === -1 || targetIndex === -1) return;

    // Create new order
    const newOrder = [...sortedProjects];
    const [draggedProject] = newOrder.splice(draggedIndex, 1);
    
    // Calculate insert position
    let insertIndex = targetIndex;
    if (dropPosition === 'after') {
      insertIndex = draggedIndex < targetIndex ? targetIndex : targetIndex + 1;
    } else {
      insertIndex = draggedIndex < targetIndex ? targetIndex - 1 : targetIndex;
    }
    
    newOrder.splice(insertIndex, 0, draggedProject);

    // Update display_order for all projects
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
      <div className="p-4 border-b flex items-center justify-between">
        <h3 className="text-lg font-semibold">Active Jobs</h3>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Reorder</span>
          <Switch 
            checked={isReorderEnabled} 
            onCheckedChange={setIsReorderEnabled}
          />
        </div>
      </div>
      <Table>
          <TableHeader>
            <TableRow>
              {isReorderEnabled && (
                <TableHead className="w-10"></TableHead>
              )}
              <TableHead 
                className={cn(
                  "select-none",
                  isReorderEnabled && "cursor-pointer hover:bg-muted/50"
                )}
                onClick={() => handleSort('address')}
              >
                <div className="flex items-center">
                  Address
                  {getSortIcon('address')}
                </div>
              </TableHead>
              <TableHead 
                className={cn(
                  "select-none",
                  isReorderEnabled && "cursor-pointer hover:bg-muted/50"
                )}
                onClick={() => handleSort('status')}
              >
                <div className="flex items-center">
                  Status
                  {getSortIcon('status')}
                </div>
              </TableHead>
              <TableHead>Schedule Progress</TableHead>
              <TableHead className="text-center">Review</TableHead>
              <TableHead className="text-center">Pay</TableHead>
              <TableHead>Next Milestone</TableHead>
              <TableHead>Schedule Update</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activeProjects.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isReorderEnabled ? 8 : 7} className="text-center text-muted-foreground py-8">
                  No active projects
                </TableCell>
              </TableRow>
            ) : (
              sortedProjects.map((project) => {
                const progress = scheduleProgress[project.id];
                const bills = billCounts[project.id];
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
                      {project.address || "No address"}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={statusColors[project.status || "In Design"]}
                      >
                        {project.status || "In Design"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 min-w-[120px]">
                        <Progress 
                          value={progress?.overallProgress || 0} 
                          className="h-2 flex-1"
                        />
                        <span className="text-sm text-muted-foreground w-10">
                          {progress?.overallProgress || 0}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {bills?.reviewCount ? (
                        <Badge variant="secondary">{bills.reviewCount}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {bills?.payCount ? (
                        <Badge variant="secondary">{bills.payCount}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {progress?.nextMilestone || "-"}
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
