
import { useState, useCallback } from 'react';
import { GanttTask } from '@/components/schedule/GanttChart';

export const useScheduleTasks = (projectId: string) => {
  const [tasks, setTasks] = useState<GanttTask[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addTask = useCallback((newTask: Omit<GanttTask, 'id'>) => {
    const task: GanttTask = {
      ...newTask,
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    
    setTasks(prev => [...prev, task]);
  }, []);

  const updateTask = useCallback((taskId: string, updates: Partial<GanttTask>) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, ...updates } : task
    ));
  }, []);

  const deleteTask = useCallback((taskId: string) => {
    setTasks(prev => prev.filter(task => task.id !== taskId));
  }, []);

  return {
    tasks,
    isLoading,
    addTask,
    updateTask,
    deleteTask
  };
};
