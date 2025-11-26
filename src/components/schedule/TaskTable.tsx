import React, { useState, useEffect } from "react";
import { ProjectTask } from "@/hooks/useProjectTasks";
import { TaskRow } from "./TaskRow";
import { generateHierarchyNumber, canIndent } from "@/utils/hierarchyUtils";
import { calculateParentTaskValues, shouldUpdateParentTask } from "@/utils/taskCalculations";
import * as moveDownUtils from "@/utils/moveDownLogic";
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
  visibleTasks: ProjectTask[];
  expandedTasks: Set<string>;
  onToggleExpand: (taskId: string) => void;
  onTaskUpdate: (taskId: string, updates: any, options?: { silent?: boolean }) => void;
  selectedTasks: Set<string>;
  onSelectedTasksChange: (selectedTasks: Set<string>) => void;
  onIndent: (taskId: string) => void;
  onOutdent: (taskId: string) => void;
  onAddAbove: (relativeTaskId: string) => void;
  onAddBelow: (relativeTaskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onBulkDelete: () => void;
  onMoveUp: (taskId: string) => void;
  onMoveDown: (taskId: string) => void;
  scrollRef?: React.RefObject<HTMLDivElement>;
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
}

export function TaskTable({ 
  tasks,
  visibleTasks,
  expandedTasks,
  onToggleExpand,
  onTaskUpdate, 
  selectedTasks, 
  onSelectedTasksChange,
  onIndent,
  onOutdent,
  onAddAbove,
  onAddBelow,
  onDeleteTask,
  onBulkDelete,
  onMoveUp,
  onMoveDown,
  scrollRef,
  onScroll
}: TaskTableProps) {

  // Enhanced onTaskUpdate that also updates parent tasks
  const handleTaskUpdate = (taskId: string, updates: any, options?: { silent?: boolean }) => {
    // Update the task itself (cascade will be handled centrally by useTaskMutations)
    onTaskUpdate(taskId, updates, options);
    
    // Handle parent task updates for hierarchy changes
    requestAnimationFrame(() => {
      const updatedTask = tasks.find(t => t.id === taskId);
      if (!updatedTask?.hierarchy_number) return;
      
      // Create a simulated updated tasks array for calculation
      const simulatedTasks = tasks.map(task => 
        task.id === taskId ? { ...task, ...updates } : task
      );
      
      // Find parent tasks by checking hierarchy levels
      const parentTasks = tasks.filter(task => {
        if (!task.hierarchy_number || task.id === taskId) return false;
        
        const taskParts = updatedTask.hierarchy_number.split('.');
        const parentParts = task.hierarchy_number.split('.');
        
        if (parentParts.length >= taskParts.length) return false;
        
        return parentParts.every((part, index) => part === taskParts[index]);
      });
      
      // Update each parent task if needed
      parentTasks.forEach(parentTask => {
        const calculations = calculateParentTaskValues(parentTask, simulatedTasks);
        if (calculations && shouldUpdateParentTask(parentTask, calculations)) {
          console.log('🔄 Cascading parent update:', parentTask.task_name, 'with calculations:', calculations);
          setTimeout(() => {
            onTaskUpdate(parentTask.id, {
              start_date: calculations.startDate,
              end_date: calculations.endDate,
              duration: calculations.duration,
              progress: calculations.progress
            }, { silent: true });
          }, 50);
        }
      });
    });
  };

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

  const handleTaskSelection = (taskId: string, checked: boolean) => {
    const newSet = new Set(selectedTasks);
    if (checked) {
      newSet.add(taskId);
    } else {
      newSet.delete(taskId);
    }
    onSelectedTasksChange(newSet);
  };


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
    onAddAbove(taskId);
  };

  const handleAddBelow = (taskId: string) => {
    onAddBelow(taskId);
  };

  const getCanIndent = (task: ProjectTask) => {
    return canIndent(task, tasks);
  };

  const getCanOutdent = (task: ProjectTask) => {
    // Only children (level 2) can be outdented to become groups (level 1)
    return task.hierarchy_number && 
           task.hierarchy_number.includes('.') && 
           task.hierarchy_number.split('.').length === 2;
  };

  const getCanMoveUp = (task: ProjectTask) => {
    const currentIndex = visibleTasks.findIndex(t => t.id === task.id);
    return currentIndex > 0;
  };

  const getCanMoveDown = (task: ProjectTask) => {
    return moveDownUtils.canMoveDown(task, visibleTasks);
  };

  return (
    <div className="h-full">
      <Table 
        containerClassName="relative w-full h-full overflow-auto"
        containerRef={scrollRef}
        onContainerScroll={onScroll}
      >
        <TableHeader>
          <TableRow className="h-8">
            <TableHead className="sticky top-0 z-30 bg-background w-10 h-8 text-xs py-1 px-2">
              <Checkbox
                checked={isAllSelected}
                onCheckedChange={handleSelectAll}
                className="h-3 w-3"
                {...(isIndeterminate && { "data-state": "indeterminate" })}
              />
            </TableHead>
            <TableHead className="sticky top-0 z-30 bg-background w-16 h-8 text-xs py-1 px-2">#</TableHead>
            <TableHead className="sticky top-0 z-30 bg-background w-48 h-8 text-xs py-1 px-2">Task Name</TableHead>
            <TableHead className="sticky top-0 z-30 bg-background w-24 h-8 text-xs py-1 px-2 whitespace-nowrap">Start Date</TableHead>
            <TableHead className="sticky top-0 z-30 bg-background w-20 h-8 text-xs py-1 px-2">Duration</TableHead>
            <TableHead className="sticky top-0 z-30 bg-background w-24 h-8 text-xs py-1 px-2 whitespace-nowrap">End Date</TableHead>
            <TableHead className="sticky top-0 z-30 bg-background w-24 h-8 text-xs py-1 px-2">Predecessors</TableHead>
            <TableHead className="sticky top-0 z-30 bg-background w-20 h-8 text-xs py-1 px-2">Progress</TableHead>
            <TableHead className="sticky top-0 z-30 bg-background w-32 h-8 text-xs py-1 px-2">Resources</TableHead>
            <TableHead className="sticky top-0 z-30 bg-background w-8 h-8 text-xs py-1 px-2"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visibleTasks.map((task, index) => (
            <TaskRow
              key={task.id}
              task={task}
              allTasks={tasks}
              index={index}
              onTaskUpdate={handleTaskUpdate}
              hasChildren={hasChildren(task.id)}
              isExpanded={expandedTasks.has(task.id)}
              onToggleExpand={onToggleExpand}
              isSelected={selectedTasks.has(task.id)}
              onTaskSelection={handleTaskSelection}
              selectedTasks={selectedTasks}
              onIndent={onIndent}
              onOutdent={onOutdent}
              onAddAbove={handleAddAbove}
              onAddBelow={handleAddBelow}
              onDelete={onDeleteTask}
              onBulkDelete={onBulkDelete}
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