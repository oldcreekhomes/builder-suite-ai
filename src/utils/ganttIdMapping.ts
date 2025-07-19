
// Utility for mapping between Syncfusion numeric IDs and database UUIDs
export class GanttIdMapper {
  private numericToUuid: Map<number, string> = new Map();
  private uuidToNumeric: Map<string, number> = new Map();
  private nextId: number = 1;

  // Initialize mapping from existing tasks
  initializeFromTasks(tasks: any[]) {
    this.numericToUuid.clear();
    this.uuidToNumeric.clear();
    this.nextId = 1;

    tasks.forEach((task) => {
      const numericId = this.nextId++;
      this.numericToUuid.set(numericId, task.id);
      this.uuidToNumeric.set(task.id, numericId);
    });
  }

  // Add new task mapping
  addTaskMapping(uuid: string): number {
    if (this.uuidToNumeric.has(uuid)) {
      return this.uuidToNumeric.get(uuid)!;
    }
    
    const numericId = this.nextId++;
    this.numericToUuid.set(numericId, uuid);
    this.uuidToNumeric.set(uuid, numericId);
    return numericId;
  }

  // Get UUID from numeric ID
  getUuid(numericId: number): string | undefined {
    return this.numericToUuid.get(numericId);
  }

  // Get numeric ID from UUID
  getNumericId(uuid: string): number | undefined {
    return this.uuidToNumeric.get(uuid);
  }

  // Convert task data for Syncfusion (UUID -> numeric)
  convertTaskForSyncfusion(task: any): any {
    const numericId = this.getNumericId(task.id) || this.addTaskMapping(task.id);
    
    const startDate = new Date(task.start_date);
    let endDate = new Date(task.end_date);
    
    // If end date is invalid (1970-01-01) or before start date, calculate from duration
    if (endDate.getTime() <= 0 || endDate < startDate) {
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + (task.duration || 1));
    }
    
    return {
      taskID: numericId,
      taskName: task.task_name,
      startDate: startDate,
      endDate: endDate,
      duration: task.duration || 1,
      progress: task.progress || 0,
      resourceInfo: this.parseResourceInfoForSyncfusion(task.assigned_to), // Convert to Syncfusion format
      dependency: this.convertDependencies(task.predecessor),
      parentID: task.parent_id ? this.getNumericId(task.parent_id) : null,
    };
  }

  // Convert task data for database (numeric -> UUID)
  convertTaskForDatabase(task: any, projectId: string): any {
    const uuid = this.getUuid(task.taskID) || crypto.randomUUID();
    
    // Ensure mapping exists for new tasks
    if (!this.getUuid(task.taskID)) {
      this.numericToUuid.set(task.taskID, uuid);
      this.uuidToNumeric.set(uuid, task.taskID);
    }

    return {
      id: uuid,
      project_id: projectId,
      task_name: task.taskName || 'New Task',
      start_date: new Date(task.startDate).toISOString(),
      end_date: new Date(task.endDate).toISOString(),
      duration: task.duration || 1,
      progress: task.progress || 0,
      assigned_to: this.convertResourceInfoToDatabase(task.resourceInfo), // Convert from Syncfusion format
      predecessor: task.dependency || null,
      parent_id: task.parentID ? this.getUuid(task.parentID) : null,
      order_index: 0,
      color: '#3b82f6'
    };
  }

  // Parse database assigned_to field into Syncfusion resourceInfo format
  private parseResourceInfoForSyncfusion(assignedTo: string | null): any[] {
    if (!assignedTo) return [];
    
    // Handle string input
    if (typeof assignedTo === 'string') {
      const resourceUUIDs = assignedTo.split(',').map(uuid => uuid.trim()).filter(uuid => uuid);
      return resourceUUIDs.map(uuid => ({
        resourceId: uuid,
        resourceName: uuid // Will be resolved by Syncfusion from resources array
      }));
    }
    
    // If it's already an array, return as is
    if (Array.isArray(assignedTo)) {
      return assignedTo;
    }
    
    return [];
  }

  // Convert Syncfusion resourceInfo back to database assigned_to format
  private convertResourceInfoToDatabase(resourceInfo: any): string | null {
    if (!resourceInfo) return null;
    
    console.log('Converting resourceInfo to database format:', resourceInfo);
    
    // If it's a string (resource name), we need to convert it to UUID
    // This will be handled by the calling function with access to resources
    if (typeof resourceInfo === 'string') {
      console.log('ResourceInfo is a string (resource name):', resourceInfo);
      return resourceInfo; // Return the string, caller will handle UUID lookup
    }
    
    // If it's an array of resource objects
    if (Array.isArray(resourceInfo)) {
      const resourceIds = resourceInfo
        .map(resource => resource.resourceId)
        .filter(id => id);
      return resourceIds.length > 0 ? resourceIds.join(',') : null;
    }
    
    // If it's a single resource object
    if (typeof resourceInfo === 'object' && resourceInfo.resourceId) {
      return resourceInfo.resourceId;
    }
    
    return null;
  }

  private convertDependencies(predecessor: string | null): string {
    if (!predecessor) return '';
    
    // Convert UUID dependencies to numeric IDs
    const deps = predecessor.split(',').map(dep => dep.trim()).filter(dep => dep);
    const numericDeps = deps.map(dep => {
      const numericId = this.getNumericId(dep);
      return numericId ? numericId.toString() : dep;
    });
    
    return numericDeps.join(',');
  }
}
