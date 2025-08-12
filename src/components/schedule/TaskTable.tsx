import React, { useState, useEffect } from "react";
import { ProjectTask } from "@/hooks/useProjectTasks";
import { TaskRow } from "./TaskRow";
import { generateHierarchyNumber, canIndent } from "@/utils/hierarchyUtils";
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
  onTaskUpdate: (taskId: string, updates: any) => void;
  selectedTasks: Set<string>;
  onSelectedTasksChange: (selectedTasks: Set<string>) => void;
  onIndent: (taskId: string) => void;
  onOutdent: (taskId: string) => void;
  onAddTask: (position: 'above' | 'below', relativeTaskId: string) => void;
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
  onAddTask,
  onDeleteTask,
  onBulkDelete,
  onMoveUp,
  onMoveDown
}: TaskTableProps) {

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
    onAddTask('above', taskId);
  };

  const handleAddBelow = (taskId: string) => {
    onAddTask('below', taskId);
  };

  const getCanIndent = (task: ProjectTask) => {
    return canIndent(task, tasks);
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