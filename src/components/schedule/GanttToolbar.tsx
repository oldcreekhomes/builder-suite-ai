
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, Expand, FoldVertical, ZoomIn, ZoomOut } from "lucide-react";

interface GanttToolbarProps {
  onQuickAddTask: () => void;
}

export function GanttToolbar({ onQuickAddTask }: GanttToolbarProps) {
  return (
    <div className="flex items-center justify-between bg-white p-4 rounded-lg border shadow-sm">
      <div className="flex items-center space-x-2">
        <Button variant="outline" size="sm" className="h-8" onClick={onQuickAddTask}>
          <Plus className="w-4 h-4 mr-2" />
          Quick Add Task
        </Button>
        <div className="w-px h-6 bg-slate-200"></div>
        <Button variant="ghost" size="sm" className="h-8">
          <Edit className="w-4 h-4 mr-2" />
          Edit
        </Button>
        <Button variant="ghost" size="sm" className="h-8">
          <Trash2 className="w-4 h-4 mr-2" />
          Delete
        </Button>
        <div className="w-px h-6 bg-slate-200"></div>
        <Button variant="ghost" size="sm" className="h-8">
          <Expand className="w-4 h-4 mr-2" />
          Expand all
        </Button>
        <Button variant="ghost" size="sm" className="h-8">
          <FoldVertical className="w-4 h-4 mr-2" />
          Collapse all
        </Button>
        <div className="w-px h-6 bg-slate-200"></div>
        <Button variant="ghost" size="sm" className="h-8">
          <ZoomIn className="w-4 h-4 mr-2" />
          Zoom in
        </Button>
        <Button variant="ghost" size="sm" className="h-8">
          <ZoomOut className="w-4 h-4 mr-2" />
          Zoom out
        </Button>
      </div>
    </div>
  );
}
