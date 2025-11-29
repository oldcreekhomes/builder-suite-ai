type TaskUpdate = {
  id: string;
  updates: Record<string, any>;
  timestamp: number;
};

export class TaskUpdateQueue {
  private queue: Map<string, TaskUpdate> = new Map();
  private timeout: NodeJS.Timeout | null = null;
  private readonly DEBOUNCE_MS = 500;
  private supabase: any;
  
  constructor(supabaseClient: any) {
    this.supabase = supabaseClient;
  }

  // Queue an update (merges with existing updates for same task)
  queueUpdate(taskId: string, updates: Record<string, any>) {
    const existing = this.queue.get(taskId);
    if (existing) {
      this.queue.set(taskId, {
        id: taskId,
        updates: { ...existing.updates, ...updates },
        timestamp: Date.now()
      });
    } else {
      this.queue.set(taskId, { id: taskId, updates, timestamp: Date.now() });
    }
    this.scheduleFlush();
  }

  private scheduleFlush() {
    if (this.timeout) clearTimeout(this.timeout);
    this.timeout = setTimeout(() => this.flush(), this.DEBOUNCE_MS);
  }

  async flush(): Promise<void> {
    if (this.queue.size === 0) return;
    const updates = Array.from(this.queue.values());
    this.queue.clear();
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }

    try {
      await this.batchUpdateToDatabase(updates);
    } catch (error) {
      console.error('Failed to flush updates:', error);
      // Re-queue failed updates for retry
      updates.forEach(update => this.queue.set(update.id, update));
      throw error;
    }
  }

  private async batchUpdateToDatabase(updates: TaskUpdate[]): Promise<void> {
    if (updates.length === 0) return;
    
    // Use upsert with all updates in a SINGLE call
    const records = updates.map(u => ({ 
      id: u.id, 
      ...u.updates,
      updated_at: new Date().toISOString()
    }));
    
    const { error } = await this.supabase
      .from('project_schedule_tasks')
      .upsert(records, { onConflict: 'id' });
    
    if (error) throw error;
    console.log(`✅ Batch updated ${updates.length} tasks in single call`);
  }

  async forceFlush(): Promise<void> {
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
    await this.flush();
  }

  getPendingCount(): number {
    return this.queue.size;
  }

  clear(): void {
    this.queue.clear();
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
  }
}
