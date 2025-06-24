
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface GanttEmptyStateProps {
  onQuickAddTask: () => void;
}

export function GanttEmptyState({ onQuickAddTask }: GanttEmptyStateProps) {
  return (
    <div className="text-center py-12 bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg border">
      <div className="max-w-md mx-auto">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Plus className="w-8 h-8 text-blue-600" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">No tasks yet</h3>
        <p className="text-slate-600 mb-6">Get started by creating your first project task</p>
        <Button onClick={onQuickAddTask} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Add Your First Task
        </Button>
      </div>
    </div>
  );
}
