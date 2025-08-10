import { ProjectTask } from '@/hooks/useProjectTasks';

// Resource interface for Syncfusion
export interface ProjectResource {
  id: number;
  name: string;
  group?: string;
  type?: string;
}

export interface ProcessedTask {
  TaskID: number;
  TaskName: string;
  StartDate: Date;
  EndDate: Date;
  Duration: number;
  Progress: number;
  Predecessor?: string;
  Resources?: string[];
  ParentTaskID?: number;
  Confirmed?: boolean;
  id: string; // Keep original ID for mutations
}

// Convert resource names to IDs for Syncfusion
export function convertResourceNamesToIds(
  resourceString: string | null,
  resources: ProjectResource[]
): string[] | null {
  if (!resourceString) return null;
  
  const resourceNames = resourceString.split(',').map(name => name.trim());
  const resourceIds: string[] = [];
  
  resourceNames.forEach(name => {
    const resource = resources.find(r => r.name === name);
    if (resource) {
      resourceIds.push(resource.id.toString());
    }
  });
  
  return resourceIds.length > 0 ? resourceIds : null;
}

// Convert resource IDs back to names for display
export function convertResourceIdsToNames(
  resourceIds: string[] | string | null,
  resources: ProjectResource[]
): string | null {
  if (!resourceIds) return null;
  
  // Handle both array and string formats
  const ids = Array.isArray(resourceIds) ? resourceIds : [resourceIds];
  const names: string[] = [];
  
  ids.forEach(id => {
    const resource = resources.find(r => r.id.toString() === id);
    if (resource) {
      names.push(resource.name);
    }
  });
  
  return names.length > 0 ? names.join(', ') : null;
}

// Simple transformation for native Syncfusion drag and drop
export function transformTasksForGantt(
  tasks: ProjectTask[],
  resources: ProjectResource[] = []
): ProcessedTask[] {
  console.log('🔄 Transforming tasks for Gantt chart:', tasks.length);
  
  if (!tasks || tasks.length === 0) {
    console.log('⚠️ No tasks to transform');
    return [];
  }

  // Sort by order_index and creation date for consistent ordering
  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.order_index !== b.order_index) {
      return a.order_index - b.order_index;
    }
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });

  // Create simple TaskID mapping (1, 2, 3...)
  const taskIdMap = new Map<string, number>();
  sortedTasks.forEach((task, index) => {
    taskIdMap.set(task.id, index + 1);
  });

  console.log('📊 Simple TaskID mapping created for', sortedTasks.length, 'tasks');

  const processedTasks: ProcessedTask[] = sortedTasks.map((task) => {
    const taskId = taskIdMap.get(task.id)!;
    
    // Find parent TaskID using parent_id
    let parentTaskId: number | undefined;
    if (task.parent_id) {
      parentTaskId = taskIdMap.get(task.parent_id);
    }
    
    // Convert resource string to array of IDs
    const resourceIds = convertResourceNamesToIds(task.resources, resources);
    
    const processedTask: ProcessedTask = {
      TaskID: taskId,
      TaskName: task.task_name,
      StartDate: new Date(task.start_date),
      EndDate: new Date(task.end_date),
      Duration: task.duration,
      Progress: task.progress || 0,
      Predecessor: task.predecessor || undefined,
      Resources: resourceIds || undefined,
      ParentTaskID: parentTaskId,
      Confirmed: task.confirmed,
      id: task.id // Keep original ID for mutations
    };

    return processedTask;
  });

  console.log(`✅ Successfully transformed ${processedTasks.length} tasks with simple mapping`);
  return processedTasks;
}