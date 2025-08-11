import React, { useState } from "react";
import { ProjectTask } from "@/hooks/useProjectTasks";
import { TaskRow } from "./TaskRow";
import { generateHierarchyNumber } from "@/utils/hierarchyUtils";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface TaskTableProps {
  tasks: ProjectTask[];
  onTaskUpdate: (taskId: string, updates: any) => void;
  selectedTasks: Set<string>;
  onSelectedTasksChange: (selectedTasks: Set<string>) => void;
  onIndent: (taskId: string) => void;
  onOutdent: (taskId: string) => void;
  onAddTask: (position: 'above' | 'below', relativeTaskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onMoveUp: (taskId: string) => void;
  onMoveDown: (taskId: string) => void;
}

export function TaskTable({ 
  tasks, 
  onTaskUpdate, 
  selectedTasks, 
  onSelectedTasksChange,
  onIndent,
  onOutdent,
  onAddTask,
  onDeleteTask,
  onMoveUp,
  onMoveDown
}: TaskTableProps) {
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

  // Helper function to check if a task has children based on hierarchy
  const hasChildren = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task?.hierarchy_number) return false;
    
    return tasks.some(t => 
      t.hierarchy_number && 
      t.hierarchy_number.startsWith(task.hierarchy_number + ".") &&
      t.hierarchy_number.split(".").length === task.hierarchy_number.split(".").length + 1
    );
  };

  // Helper function to get all descendant task IDs based on hierarchy
  const getDescendants = (taskId: string): string[] => {
    const task = tasks.find(t => t.id === taskId);
    if (!task?.hierarchy_number) return [];
    
    return tasks
      .filter(t => 
        t.hierarchy_number && 
        t.hierarchy_number.startsWith(task.hierarchy_number + ".")
      )
      .map(t => t.id);
  };

  // Filter tasks based on expansion state using hierarchy numbers
  const getVisibleTasks = () => {
    const visibleTasks: ProjectTask[] = [];
    
    for (const task of sortedTasks) {
      if (!task.hierarchy_number) {
        visibleTasks.push(task);
        continue;
      }
      
      // Always show root tasks (no dots in hierarchy)
      if (!task.hierarchy_number.includes(".")) {
        visibleTasks.push(task);
        continue;
      }
      
      // For nested tasks, check if all parent levels are expanded
      const hierarchyParts = task.hierarchy_number.split(".");
      let shouldShow = true;
      
      // Check each parent level
      for (let i = 1; i < hierarchyParts.length; i++) {
        const parentHierarchy = hierarchyParts.slice(0, i).join(".");
        const parentTask = tasks.find(t => t.hierarchy_number === parentHierarchy);
        
        if (parentTask && !expandedTasks.has(parentTask.id)) {
          shouldShow = false;
          break;
        }
      }
      
      if (shouldShow) {
        visibleTasks.push(task);
      }
    }
    
    return visibleTasks;
  };

  const handleToggleExpand = (taskId: string) => {
    setExpandedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const handleTaskSelection = (taskId: string, checked: boolean) => {
    const newSet = new Set(selectedTasks);
    if (checked) {
      newSet.add(taskId);
    } else {
      newSet.delete(taskId);
    }
    onSelectedTasksChange(newSet);
  };

  // Sort tasks by hierarchy number for display
  const sortedTasks = [...tasks].sort((a, b) => {
    const aNum = a.hierarchy_number || "999";
    const bNum = b.hierarchy_number || "999";
    return aNum.localeCompare(bNum, undefined, { numeric: true });
  });

  const visibleTasks = getVisibleTasks();

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectedTasksChange(new Set(visibleTasks.map(task => task.id)));
    } else {
      onSelectedTasksChange(new Set());
    }
  };

  const isAllSelected = visibleTasks.length > 0 && visibleTasks.every(task => selectedTasks.has(task.id));
  const isIndeterminate = selectedTasks.size > 0 && !isAllSelected;

  const handleAddAbove = (taskId: string) => {
    onAddTask('above', taskId);
  };

  const handleAddBelow = (taskId: string) => {
    onAddTask('below', taskId);
  };

  const getCanIndent = (task: ProjectTask) => {
    const sortedTasks = [...tasks].sort((a, b) => {
      const aNum = a.hierarchy_number || "999";
      const bNum = b.hierarchy_number || "999";
      return aNum.localeCompare(bNum, undefined, { numeric: true });
    });

    const currentIndex = sortedTasks.findIndex(t => t.id === task.id);
    return currentIndex > 0;
  };

  const getCanOutdent = (task: ProjectTask) => {
    return task.hierarchy_number && task.hierarchy_number.split(".").length > 1;
  };

  const getCanMoveUp = (task: ProjectTask) => {
    const currentIndex = visibleTasks.findIndex(t => t.id === task.id);
    return currentIndex > 0;
  };

  const getCanMoveDown = (task: ProjectTask) => {
    const currentIndex = visibleTasks.findIndex(t => t.id === task.id);
    return currentIndex < visibleTasks.length - 1;
  };

  return (
    <div className="h-[600px] overflow-auto">
      <Table>
        <TableHeader>
          <TableRow className="h-8">
            <TableHead className="w-10 text-xs py-1 px-2">
              <Checkbox
                checked={isAllSelected}
                onCheckedChange={handleSelectAll}
                className="h-3 w-3"
                {...(isIndeterminate && { "data-state": "indeterminate" })}
              />
            </TableHead>
            <TableHead className="w-16 text-xs py-1 px-2">#</TableHead>
            <TableHead className="w-48 text-xs py-1 px-2">Task Name</TableHead>
            <TableHead className="w-24 text-xs py-1 px-2 whitespace-nowrap">Start Date</TableHead>
            <TableHead className="w-20 text-xs py-1 px-2">Duration</TableHead>
            <TableHead className="w-24 text-xs py-1 px-2 whitespace-nowrap">End Date</TableHead>
            <TableHead className="w-20 text-xs py-1 px-2">Progress</TableHead>
            <TableHead className="w-32 text-xs py-1 px-2">Resources</TableHead>
            <TableHead className="w-8 text-xs py-1 px-2"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visibleTasks.map((task, index) => (
            <TaskRow
              key={task.id}
              task={task}
              index={index}
              onTaskUpdate={onTaskUpdate}
              hasChildren={hasChildren(task.id)}
              isExpanded={expandedTasks.has(task.id)}
              onToggleExpand={handleToggleExpand}
              isSelected={selectedTasks.has(task.id)}
              onTaskSelection={handleTaskSelection}
              onIndent={onIndent}
              onOutdent={onOutdent}
              onAddAbove={handleAddAbove}
              onAddBelow={handleAddBelow}
              onDelete={onDeleteTask}
              onMoveUp={onMoveUp}
              onMoveDown={onMoveDown}
              canIndent={getCanIndent(task)}
              canOutdent={getCanOutdent(task)}
              canMoveUp={getCanMoveUp(task)}
              canMoveDown={getCanMoveDown(task)}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}