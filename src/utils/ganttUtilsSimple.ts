import { ProjectTask } from '@/hooks/useProjectTasks';

export interface ProjectResource {
  resourceId: string;
  resourceName: string;
  resourceGroup?: string;
  type?: string;
}

// Helper function to convert resource IDs to names for display
export const convertResourceIdsToNames = (resourceIds: string[] | string | null, resources: ProjectResource[]): string | null => {
  if (!resourceIds || !resources || resources.length === 0) return null;
  
  // Handle both array and string inputs
  const ids = Array.isArray(resourceIds) ? resourceIds : [resourceIds];
  
  const names = ids
    .map(id => {
      const resource = resources.find(r => r.resourceId === id);
      return resource ? resource.resourceName : null;
    })
    .filter(name => name !== null);
  
  return names.length > 0 ? names.join(', ') : null;
};

// Helper function to convert resource names to IDs
export const convertResourceNamesToIds = (resourceString: string | null, resources: ProjectResource[]): string[] | null => {
  if (!resourceString || resourceString.trim() === '' || !resources || resources.length === 0) {
    return null;
  }
  
  const resourceNames = resourceString.split(',').map(name => name.trim());
  const resourceIds: string[] = [];
  
  resourceNames.forEach(name => {
    const resource = resources.find(r => r.resourceName === name);
    if (resource) {
      resourceIds.push(resource.resourceId);
    }
  });
  
  return resourceIds.length > 0 ? resourceIds : null;
};

// Simple task sorting by order index and hierarchy
export const sortTasksByHierarchy = (tasks: ProjectTask[]): ProjectTask[] => {
  return tasks.sort((a, b) => {
    // First sort by order_index
    if (a.order_index !== b.order_index) {
      return a.order_index - b.order_index;
    }
    
    // Then sort by creation date as fallback
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });
};

// Get all child tasks for a given parent
export const getChildTasks = (parentId: string, allTasks: ProjectTask[]): ProjectTask[] => {
  return allTasks.filter(task => task.parent_id === parentId);
};

// Get all root tasks (tasks without parents)
export const getRootTasks = (allTasks: ProjectTask[]): ProjectTask[] => {
  return allTasks.filter(task => !task.parent_id);
};