
export interface TaskWithHierarchicalId {
  TaskID: string;
  TaskName: string;
  StartDate: Date;
  EndDate?: Date;
  Duration?: number;
  Progress: number;
  Predecessor?: string;
  parentID?: string;
  Resources?: number[];
  subtasks?: TaskWithHierarchicalId[];
}

export const generateHierarchicalIds = (data: any[], parentId = ''): TaskWithHierarchicalId[] => {
  return data.map((item, index) => {
    const currentId = parentId ? `${parentId}.${index + 1}` : `${index + 1}`;
    return {
      ...item,
      TaskID: currentId,
      parentID: parentId || undefined,
      subtasks: item.subtasks ? generateHierarchicalIds(item.subtasks, currentId) : undefined
    };
  });
};

export const getNextHierarchicalId = (data: TaskWithHierarchicalId[], parentId?: string): string => {
  console.log('=== DEBUG getNextHierarchicalId START ===');
  console.log('Input data length:', data?.length);
  console.log('Input parentId:', parentId);
  
  if (!parentId) {
    // Root level - find the highest number
    console.log('DEBUG: Generating root-level ID');
    const rootTasks = data.filter(task => !task.parentID);
    console.log('DEBUG: Root tasks found:', rootTasks.length);
    
    const maxId = rootTasks.reduce((max, task) => {
      const idNum = parseInt(task.TaskID);
      console.log('DEBUG: Processing root task ID:', task.TaskID, 'parsed as:', idNum, 'current max:', max);
      return idNum > max ? idNum : max;
    }, 0);
    
    const nextRootId = `${maxId + 1}`;
    console.log('DEBUG: Next root ID will be:', nextRootId);
    console.log('=== DEBUG getNextHierarchicalId END (ROOT) ===');
    return nextRootId;
  } else {
    // Child level - find the highest sub-number for this parent
    console.log('DEBUG: Generating child-level ID for parent:', parentId);
    const siblings = data.filter(task => task.parentID === parentId);
    console.log('DEBUG: Siblings found for parent', parentId, ':', siblings.length);
    
    const maxSubId = siblings.reduce((max, task) => {
      const parts = task.TaskID.split('.');
      const subNum = parseInt(parts[parts.length - 1]);
      console.log('DEBUG: Processing sibling ID:', task.TaskID, 'parts:', parts, 'last part:', parts[parts.length - 1], 'parsed as:', subNum, 'current max:', max);
      return subNum > max ? subNum : max;
    }, 0);
    
    const nextChildId = `${parentId}.${maxSubId + 1}`;
    console.log('DEBUG: Next child ID will be:', nextChildId);
    console.log('=== DEBUG getNextHierarchicalId END (CHILD) ===');
    return nextChildId;
  }
};

export const determineAddContext = (selectedTask: TaskWithHierarchicalId | null, data: TaskWithHierarchicalId[]) => {
  console.log('=== DEBUG determineAddContext START ===');
  console.log('Selected task:', selectedTask?.TaskID, selectedTask?.TaskName);
  
  if (!selectedTask) {
    console.log('DEBUG: No selection - adding root task');
    return { type: 'root', parentId: undefined };
  }
  
  // Check if selected task has children (subtasks)
  const hasChildren = data.some(task => task.parentID === selectedTask.TaskID);
  console.log('DEBUG: Selected task has children:', hasChildren);
  
  if (hasChildren) {
    // If task has children, default to adding a child
    console.log('DEBUG: Adding child to task with existing children');
    return { type: 'child', parentId: selectedTask.TaskID };
  } else {
    // If task has no children, add a sibling at the same level
    console.log('DEBUG: Adding sibling to task without children');
    return { type: 'sibling', parentId: selectedTask.parentID };
  }
};

export const regenerateHierarchicalIds = (data: TaskWithHierarchicalId[]): TaskWithHierarchicalId[] => {
  console.log('=== DEBUG regenerateHierarchicalIds START ===');
  console.log('Input data length:', data?.length);
  
  if (!data || data.length === 0) {
    return [];
  }

  // Create a tree structure from the flat data
  const createTreeStructure = (tasks: TaskWithHierarchicalId[]) => {
    const rootTasks: TaskWithHierarchicalId[] = [];
    const taskMap = new Map<string, TaskWithHierarchicalId>();
    
    // First pass: create map of all tasks
    tasks.forEach(task => {
      taskMap.set(task.TaskID, { ...task, subtasks: [] });
    });
    
    // Second pass: build tree structure
    tasks.forEach(task => {
      const taskCopy = taskMap.get(task.TaskID);
      if (!taskCopy) return;
      
      if (!task.parentID) {
        rootTasks.push(taskCopy);
      } else {
        const parent = taskMap.get(task.parentID);
        if (parent) {
          if (!parent.subtasks) parent.subtasks = [];
          parent.subtasks.push(taskCopy);
        }
      }
    });
    
    return rootTasks;
  };

  // Convert tree structure back to flat array with new hierarchical IDs
  const flattenWithNewIds = (tasks: TaskWithHierarchicalId[], parentId = ''): TaskWithHierarchicalId[] => {
    const result: TaskWithHierarchicalId[] = [];
    
    tasks.forEach((task, index) => {
      const newId = parentId ? `${parentId}.${index + 1}` : `${index + 1}`;
      const updatedTask: TaskWithHierarchicalId = {
        ...task,
        TaskID: newId,
        parentID: parentId || undefined
      };
      
      result.push(updatedTask);
      
      // Process children recursively
      if (task.subtasks && task.subtasks.length > 0) {
        const childTasks = flattenWithNewIds(task.subtasks, newId);
        result.push(...childTasks);
      }
    });
    
    return result;
  };

  // Build tree structure
  const treeStructure = createTreeStructure(data);
  console.log('DEBUG: Tree structure created with', treeStructure.length, 'root tasks');
  
  // Flatten with new hierarchical IDs
  const result = flattenWithNewIds(treeStructure);
  
  console.log('DEBUG: Regenerated', result.length, 'tasks with new hierarchical IDs');
  console.log('DEBUG: Sample of regenerated IDs:');
  result.slice(0, 10).forEach((task, index) => {
    console.log(`  [${index}]:`, {
      oldID: data.find(d => d.TaskName === task.TaskName)?.TaskID,
      newID: task.TaskID,
      TaskName: task.TaskName,
      parentID: task.parentID
    });
  });
  
  console.log('=== DEBUG regenerateHierarchicalIds END ===');
  return result;
};
