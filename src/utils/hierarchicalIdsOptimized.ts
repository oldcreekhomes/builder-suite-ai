
import { TaskWithHierarchicalId } from './hierarchicalIds';

// Optimized hierarchical ID regeneration for better performance
export const optimizedRegenerateHierarchicalIds = (data: TaskWithHierarchicalId[]): TaskWithHierarchicalId[] => {
  if (!data || data.length === 0) {
    return [];
  }

  // Create parent-children mapping for O(n) lookup instead of O(n²)
  const childrenMap = new Map<string | undefined, TaskWithHierarchicalId[]>();
  const allTasks = new Map<string, TaskWithHierarchicalId>();
  
  // Single pass to build maps
  data.forEach(task => {
    allTasks.set(task.TaskID, { ...task });
    
    const parentKey = task.parentID || 'root';
    if (!childrenMap.has(parentKey)) {
      childrenMap.set(parentKey, []);
    }
    childrenMap.get(parentKey)!.push(task);
  });

  // Sort children by their current position to maintain order
  for (const children of childrenMap.values()) {
    children.sort((a, b) => {
      // Extract numeric part for proper sorting
      const aNum = parseFloat(a.TaskID.split('.').pop() || '0');
      const bNum = parseFloat(b.TaskID.split('.').pop() || '0');
      return aNum - bNum;
    });
  }

  const result: TaskWithHierarchicalId[] = [];

  // Recursive function to process tree levels efficiently
  const processLevel = (parentId: string | undefined, prefix: string = '') => {
    const parentKey = parentId || 'root';
    const children = childrenMap.get(parentKey) || [];
    
    children.forEach((child, index) => {
      const newId = prefix ? `${prefix}.${index + 1}` : `${index + 1}`;
      
      const updatedTask: TaskWithHierarchicalId = {
        ...child,
        TaskID: newId,
        parentID: parentId
      };
      
      result.push(updatedTask);
      
      // Process children recursively
      processLevel(child.TaskID, newId);
    });
  };

  // Start with root level tasks
  processLevel(undefined);

  return result;
};
