import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useProjects } from "@/hooks/useProjects";
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
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { ArrowUpDown, ArrowUp, ArrowDown, GripVertical, Search } from "lucide-react";
import { cn } from "@/lib/utils";

const statusPriority: Record<string, number> = {
  "Under Construction": 1,
  "Permitting": 2,
  "In Design": 3,
};

export function AccountantJobsTable() {
  const navigate = useNavigate();
  const { data: projects = [] } = useProjects();
  const { updateDisplayOrder } = useProjectDisplayOrder();
  const [sortColumn, setSortColumn] = useState<'address'>('address');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [isReorderEnabled, setIsReorderEnabled] = useState(false);
  const [showQuickBooks, setShowQuickBooks] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [draggedProjectId, setDraggedProjectId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | null>(null);
  const dragRowRef = useRef<HTMLTableRowElement | null>(null);
  
  // Filter to active projects only (not completed, not template) AND by accounting software AND by search query
  const softwareFilter = showQuickBooks ? 'quickbooks' : 'builder_suite';
  const activeProjects = projects.filter(p => {
    if (p.status === "Completed" || p.status === "Template") return false;
    if ((p as any).accounting_software !== softwareFilter) return false;
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const address = (p.address || "").toLowerCase();
      const managerName = p.accounting_manager_user 
        ? `${p.accounting_manager_user.first_name} ${p.accounting_manager_user.last_name}`.toLowerCase()
        : "";
      
      if (!address.includes(query) && !managerName.includes(query)) {
        return false;
      }
    }
    
    return true;
  });
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
    
    const addressA = (a.address || "").toLowerCase();
    const addressB = (b.address || "").toLowerCase();
    return sortDirection === 'asc' 
      ? addressA.localeCompare(addressB) 
      : addressB.localeCompare(addressA);
  });

  const handleSort = (column: 'address') => {
    if (!isReorderEnabled) return;
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (column: 'address') => {
    if (!isReorderEnabled) return null;
    if (sortColumn !== column) return <ArrowUpDown className="h-4 w-4 ml-1" />;
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-4 w-4 ml-1" /> 
      : <ArrowDown className="h-4 w-4 ml-1" />;
  };

  const { data: billCounts = {} } = useBillCountsByProject(projectIds);

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, projectId: string) => {
    if (!isReorderEnabled) return;
    setDraggedProjectId(projectId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', projectId);
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

    const newOrder = [...sortedProjects];
    const [draggedProject] = newOrder.splice(draggedIndex, 1);
    
    let insertIndex = targetIndex;
    if (dropPosition === 'after') {
      insertIndex = draggedIndex < targetIndex ? targetIndex : targetIndex + 1;
    } else {
      insertIndex = draggedIndex < targetIndex ? targetIndex - 1 : targetIndex;
    }
    
    newOrder.splice(insertIndex, 0, draggedProject);

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
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold">Active Jobs</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search jobs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Builder Suite</span>
            <Switch 
              checked={showQuickBooks} 
              onCheckedChange={setShowQuickBooks}
            />
            <span className="text-sm text-muted-foreground">QuickBooks</span>
          </div>
          <div className="w-px h-6 bg-border" />
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Reorder</span>
            <Switch 
              checked={isReorderEnabled} 
              onCheckedChange={setIsReorderEnabled}
            />
          </div>
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
            <TableHead>Accounting Manager</TableHead>
            <TableHead className="text-center">Review</TableHead>
            <TableHead className="text-center">Pay</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {activeProjects.length === 0 ? (
            <TableRow>
              <TableCell colSpan={isReorderEnabled ? 5 : 4} className="text-center text-muted-foreground py-8">
                No active projects
              </TableCell>
            </TableRow>
          ) : (
            sortedProjects.map((project) => {
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
                    {project.accounting_manager_user 
                      ? `${project.accounting_manager_user.first_name} ${project.accounting_manager_user.last_name}`
                      : <span className="text-muted-foreground">-</span>
                    }
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
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
