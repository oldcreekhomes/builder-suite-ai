import React, { useState, useEffect } from "react";
import { ProjectTask } from "@/hooks/useProjectTasks";
import { TaskRow } from "./TaskRow";
import { generateHierarchyNumber, canIndent } from "@/utils/hierarchyUtils";
import { calculateParentTaskValues, shouldUpdateParentTask, calculateTaskDatesFromPredecessors, getDependentTasks } from "@/utils/taskCalculations";
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
  onMoveDown
}: TaskTableProps) {

  // Enhanced onTaskUpdate that also updates parent tasks and handles predecessor dependencies
  const handleTaskUpdate = (taskId: string, updates: any, options?: { silent?: boolean }) => {
    // First update the task itself
    onTaskUpdate(taskId, updates, options);
    
    // Then immediately update any parent tasks and cascade predecessor changes
    // Use requestAnimationFrame to ensure the update has been processed
    requestAnimationFrame(() => {
      // Get the current task that was updated
      const updatedTask = tasks.find(t => t.id === taskId);
      if (!updatedTask) return;
      
      // Create a simulated updated tasks array for calculation
      const simulatedTasks = tasks.map(task => 
        task.id === taskId ? { ...task, ...updates } : task
      );
      
      // Find all tasks that could be parents of the updated task
      const taskHierarchy = updatedTask.hierarchy_number;
      if (!taskHierarchy) return;
      
      // Find parent tasks by checking hierarchy levels
      const parentTasks = tasks.filter(task => {
        if (!task.hierarchy_number || task.id === taskId) return false;
        
        // Check if this task is a parent of the updated task
        const taskParts = taskHierarchy.split('.');
        const parentParts = task.hierarchy_number.split('.');
        
        // Parent should have fewer hierarchy levels
        if (parentParts.length >= taskParts.length) return false;
        
        // All parent parts should match the beginning of task parts
        return parentParts.every((part, index) => part === taskParts[index]);
      });
      
      // Update each parent task
      parentTasks.forEach(parentTask => {
        const calculations = calculateParentTaskValues(parentTask, simulatedTasks);
        if (calculations && shouldUpdateParentTask(parentTask, calculations)) {
          console.log('🔄 Cascading parent update:', parentTask.task_name, 'with calculations:', calculations);
          // Use a slight delay to ensure the child task update has been processed
          setTimeout(() => {
            onTaskUpdate(parentTask.id, {
              start_date: calculations.startDate,
              end_date: calculations.endDate,
              duration: calculations.duration,
              progress: calculations.progress
            }, { silent: true }); // Silent update for cascaded parent updates
          }, 50);
        }
      });
      
      // Handle cascading updates for dependent tasks (tasks that have this task as predecessor)
      if (updates.start_date || updates.end_date || updates.duration) {
        cascadeTaskUpdates(taskId, simulatedTasks);
      }
    });
  };
  
  // Cascade updates to dependent tasks when a task's dates change
  const cascadeTaskUpdates = (changedTaskId: string, allTasks: ProjectTask[], processedTasks = new Set<string>(), maxDepth = 10) => {
    // Prevent infinite loops and excessive depth
    if (processedTasks.has(changedTaskId) || processedTasks.size > maxDepth) {
      console.log(`⚠️ Cascade stopped for ${changedTaskId}: already processed or max depth reached`);
      return;
    }
    processedTasks.add(changedTaskId);
    
    const dependentTasks = getDependentTasks(changedTaskId, allTasks);
    console.log(`📋 Found ${dependentTasks.length} dependent tasks for ${changedTaskId}:`, 
      dependentTasks.map(t => `${t.hierarchy_number}: ${t.task_name}`));
    
    const tasksToUpdate: Array<{ task: ProjectTask; dateUpdate: any }> = [];
    
    dependentTasks.forEach(depTask => {
      const dateUpdate = calculateTaskDatesFromPredecessors(depTask, allTasks);
      if (dateUpdate) {
        // Check if the dates actually need to change
        const currentStartDate = depTask.start_date.split('T')[0];
        const currentEndDate = depTask.end_date.split('T')[0];
        
        if (currentStartDate !== dateUpdate.startDate || currentEndDate !== dateUpdate.endDate) {
          console.log(`🔄 Will cascade update: ${depTask.hierarchy_number}: ${depTask.task_name}`, 
            `${currentStartDate} → ${dateUpdate.startDate}, ${currentEndDate} → ${dateUpdate.endDate}`);
          tasksToUpdate.push({ task: depTask, dateUpdate });
        } else {
          console.log(`⏭️ Skip cascade (no change): ${depTask.hierarchy_number}: ${depTask.task_name}`);
        }
      }
    });
    
    // Batch all updates with suppressInvalidate to avoid multiple refreshes
    tasksToUpdate.forEach(({ task, dateUpdate }) => {
      onTaskUpdate(task.id, {
        start_date: dateUpdate.startDate,
        end_date: dateUpdate.endDate,
        duration: dateUpdate.duration,
        suppressInvalidate: true // Suppress individual cache invalidations
      }, { silent: true });
    });
    
    // If we updated tasks, continue cascading recursively
    if (tasksToUpdate.length > 0) {
      // Update the simulated tasks array for further cascading
      const updatedSimulatedTasks = allTasks.map(task => {
        const updateInfo = tasksToUpdate.find(u => u.task.id === task.id);
        return updateInfo ? { 
          ...task, 
          start_date: updateInfo.dateUpdate.startDate,
          end_date: updateInfo.dateUpdate.endDate,
          duration: updateInfo.dateUpdate.duration
        } : task;
      });
      
      // Recursively cascade to further dependent tasks
      setTimeout(() => {
        tasksToUpdate.forEach(({ task }) => {
          cascadeTaskUpdates(task.id, updatedSimulatedTasks, new Set(processedTasks), maxDepth);
        });
        
        // Fire single query invalidation after all cascades complete
        setTimeout(() => {
          console.log('✅ Cascade complete - refreshing cache');
          // This will trigger a query invalidation to refresh the UI
          window.dispatchEvent(new CustomEvent('cascade-complete'));
        }, 200);
      }, 50);
    }
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
      <Table containerClassName="relative w-full h-full overflow-auto">
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
            <TableHead className="w-24 text-xs py-1 px-2">Predecessors</TableHead>
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