
export interface TaskWithHierarchicalId {
  TaskID: string;
  TaskName: string;
  StartDate: Date;
  EndDate?: Date;
  Duration?: number;
  Progress: number;
  Predecessor?: string;
  parentID?: string;
  Resources?: number[]; // Added Resources field
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
  console.log('Data sample (first 5 items):');
  data?.slice(0, 5).forEach((task, index) => {
    console.log(`  [${index}]:`, {
      TaskID: task.TaskID,
      TaskName: task.TaskName,
      parentID: task.parentID,
      Resources: task.Resources
    });
  });
  
  if (!parentId) {
    // Root level - find the highest number
    console.log('DEBUG: Generating root-level ID');
    const rootTasks = data.filter(task => !task.parentID);
    console.log('DEBUG: Root tasks found:', rootTasks.length);
    console.log('DEBUG: Root task details:');
    rootTasks.forEach((task, index) => {
      console.log(`  Root[${index}]:`, {
        TaskID: task.TaskID,
        TaskName: task.TaskName,
        parentID: task.parentID
      });
    });
    
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
    console.log('DEBUG: Sibling details:');
    siblings.forEach((sibling, index) => {
      console.log(`  Sibling[${index}]:`, {
        TaskID: sibling.TaskID,
        TaskName: sibling.TaskName,
        parentID: sibling.parentID
      });
    });
    
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
