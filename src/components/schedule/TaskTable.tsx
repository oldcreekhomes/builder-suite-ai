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
  onTaskMove: (taskId: string, newHierarchyNumber: string) => void;
  onTaskUpdate: (taskId: string, updates: any) => void;
  selectedTasks: Set<string>;
  onSelectedTasksChange: (selectedTasks: Set<string>) => void;
}

export function TaskTable({ tasks, onTaskMove, onTaskUpdate, selectedTasks, onSelectedTasksChange }: TaskTableProps) {
  const [draggedTask, setDraggedTask] = useState<ProjectTask | null>(null);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

  // Helper function to check if a task has children
  const hasChildren = (taskId: string) => {
    return tasks.some(task => task.parent_id === taskId);
  };

  // Helper function to get all descendant task IDs
  const getDescendants = (taskId: string): string[] => {
    const descendants: string[] = [];
    const directChildren = tasks.filter(task => task.parent_id === taskId);
    
    for (const child of directChildren) {
      descendants.push(child.id);
      descendants.push(...getDescendants(child.id));
    }
    
    return descendants;
  };

  // Filter tasks based on expansion state
  const getVisibleTasks = () => {
    const visibleTasks: ProjectTask[] = [];
    
    for (const task of sortedTasks) {
      // Always show root tasks (no parent)
      if (!task.parent_id || task.parent_id === '') {
        visibleTasks.push(task);
        continue;
      }
      
      // For tasks with parents, check if all ancestors are expanded
      let shouldShow = true;
      let currentParentId = task.parent_id;
      
      while (currentParentId && currentParentId !== '') {
        if (!expandedTasks.has(currentParentId)) {
          shouldShow = false;
          break;
        }
        
        // Find the parent task to check its parent
        const parentTask = tasks.find(t => t.id === currentParentId);
        currentParentId = parentTask?.parent_id || '';
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

  const handleDragStart = (e: React.DragEvent, task: ProjectTask) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    
    if (!draggedTask) return;

    // Calculate new hierarchy number based on position
    const newHierarchyNumber = generateHierarchyNumber(tasks, targetIndex);
    
    onTaskMove(draggedTask.id, newHierarchyNumber);
    setDraggedTask(null);
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
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onTaskUpdate={onTaskUpdate}
              isDragging={draggedTask?.id === task.id}
              hasChildren={hasChildren(task.id)}
              isExpanded={expandedTasks.has(task.id)}
              onToggleExpand={handleToggleExpand}
              isSelected={selectedTasks.has(task.id)}
              onTaskSelection={handleTaskSelection}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}