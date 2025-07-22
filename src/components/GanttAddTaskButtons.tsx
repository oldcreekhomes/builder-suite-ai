
import { Button } from "@/components/ui/button";
import { Plus, PlusSquare, TreePine } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface GanttAddTaskButtonsProps {
  onAddTask: (type: 'root' | 'child' | 'sibling') => void;
  selectedTaskName?: string;
  hasSelection: boolean;
}

export const GanttAddTaskButtons = ({ 
  onAddTask, 
  selectedTaskName, 
  hasSelection 
}: GanttAddTaskButtonsProps) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="flex items-center space-x-2">
          <Plus className="h-4 w-4" />
          <span>Add Task</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={() => onAddTask('root')}>
          <TreePine className="h-4 w-4 mr-2" />
          <span>Add Root Task</span>
        </DropdownMenuItem>
        
        {hasSelection && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onAddTask('child')}>
              <PlusSquare className="h-4 w-4 mr-2" />
              <span>Add Child Task</span>
              {selectedTaskName && (
                <span className="ml-2 text-xs text-gray-500 truncate">
                  under "{selectedTaskName}"
                </span>
              )}
            </DropdownMenuItem>
            
            <DropdownMenuItem onClick={() => onAddTask('sibling')}>
              <Plus className="h-4 w-4 mr-2" />
              <span>Add Sibling Task</span>
              {selectedTaskName && (
                <span className="ml-2 text-xs text-gray-500 truncate">
                  next to "{selectedTaskName}"
                </span>
              )}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
