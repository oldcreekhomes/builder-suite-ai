
// Simplified utility for mapping between Syncfusion numeric IDs and database UUIDs
export class GanttIdMapper {
  private numericToUuid: Map<number, string> = new Map();
  private uuidToNumeric: Map<string, number> = new Map();
  private nextId: number = 1;

  // Initialize mapping from existing tasks
  initializeFromTasks(tasks: any[]) {
    console.log('=== INITIALIZING ID MAPPER ===');
    this.numericToUuid.clear();
    this.uuidToNumeric.clear();
    this.nextId = 1;

    // Sort tasks by order_index then by UUID for consistent ID assignment
    const sortedTasks = [...tasks].sort((a, b) => {
      const orderA = a.order_index || 0;
      const orderB = b.order_index || 0;
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      return a.id.localeCompare(b.id);
    });

    sortedTasks.forEach((task) => {
      const numericId = this.nextId++;
      this.numericToUuid.set(numericId, task.id);
      this.uuidToNumeric.set(task.id, numericId);
      console.log(`Mapped: ${numericId} <-> ${task.id} (${task.task_name})`);
    });
    
    console.log('ID mapping initialized:', {
      totalTasks: sortedTasks.length,
      nextId: this.nextId
    });
    console.log('=== END INITIALIZING ID MAPPER ===');
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
    const numericId = this.getNumericId(task.id);
    if (!numericId) {
      console.error('No numeric ID found for task:', task.id);
      return null;
    }
    
    const startDate = new Date(task.start_date);
    let endDate = new Date(task.end_date);
    
    // If end date is invalid, calculate from duration
    if (endDate.getTime() <= 0 || endDate < startDate) {
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + (task.duration || 1));
    }
    
    // Convert parent ID
    let parentNumericId = null;
    if (task.parent_id && task.parent_id.toString().trim() !== '') {
      parentNumericId = parseInt(task.parent_id.toString());
      if (isNaN(parentNumericId)) {
        console.warn(`Invalid parent ID: "${task.parent_id}"`);
        parentNumericId = null;
      }
    }
    
    const syncTask = {
      taskID: numericId,
      taskName: task.task_name,
      startDate: startDate,
      endDate: endDate,
      duration: task.duration || 1,
      progress: task.progress || 0,
      resourceInfo: this.parseResourceInfo(task.assigned_to),
      dependency: task.predecessor || '',
      parentID: parentNumericId,
    };
    
    console.log(`Converted task for Syncfusion: ${task.task_name}`, syncTask);
    return syncTask;
  }

  // Parse assigned_to field into Syncfusion resourceInfo format
  private parseResourceInfo(assignedTo: string | null): any[] {
    if (!assignedTo) return [];
    
    if (typeof assignedTo === 'string') {
      const resourceUUIDs = assignedTo.split(',').map(uuid => uuid.trim()).filter(uuid => uuid);
      return resourceUUIDs.map(uuid => ({
        resourceId: uuid,
        resourceName: uuid // Will be resolved by Syncfusion from resources array
      }));
    }
    
    return [];
  }
}
