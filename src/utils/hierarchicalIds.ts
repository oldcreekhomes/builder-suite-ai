
export interface TaskWithHierarchicalId {
  TaskID: string;
  TaskName: string;
  StartDate: Date;
  EndDate?: Date;
  Duration?: number;
  Progress: number;
  Predecessor?: string;
  parentID?: string;
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
  if (!parentId) {
    // Root level - find the highest number
    const rootTasks = data.filter(task => !task.parentID);
    const maxId = rootTasks.reduce((max, task) => {
      const idNum = parseInt(task.TaskID);
      return idNum > max ? idNum : max;
    }, 0);
    return `${maxId + 1}`;
  } else {
    // Child level - find the highest sub-number for this parent
    const siblings = data.filter(task => task.parentID === parentId);
    const maxSubId = siblings.reduce((max, task) => {
      const parts = task.TaskID.split('.');
      const subNum = parseInt(parts[parts.length - 1]);
      return subNum > max ? subNum : max;
    }, 0);
    return `${parentId}.${maxSubId + 1}`;
  }
};
