import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Plus, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

interface DependencyManagerProps {
  projectId: string;
}

export function DependencyManager({ projectId }: DependencyManagerProps) {
  const [newDependency, setNewDependency] = useState({
    source_task_id: '',
    target_task_id: '',
    dependency_type: 'finish_to_start',
    lag_days: 0
  });

  const queryClient = useQueryClient();

  const { data: tasks = [] } = useQuery({
    queryKey: ['project-schedule-tasks', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_schedule_tasks')
        .select('id, task_name')
        .eq('project_id', projectId)
        .order('task_name');
      
      if (error) throw error;
      return data;
    }
  });

  const { data: dependencies = [], isLoading } = useQuery({
    queryKey: ['task-dependencies', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_dependencies')
        .select(`
          *,
          source_task:project_schedule_tasks!source_task_id(task_name),
          target_task:project_schedule_tasks!target_task_id(task_name)
        `)
        .in('source_task_id', tasks.map(t => t.id));
      
      if (error) throw error;
      return data;
    },
    enabled: tasks.length > 0
  });

  const createDependencyMutation = useMutation({
    mutationFn: async (dependencyData: typeof newDependency) => {
      if (dependencyData.source_task_id === dependencyData.target_task_id) {
        throw new Error('A task cannot depend on itself');
      }

      const { data, error } = await supabase
        .from('task_dependencies')
        .insert(dependencyData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-dependencies', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-schedule', projectId] });
      setNewDependency({
        source_task_id: '',
        target_task_id: '',
        dependency_type: 'finish_to_start',
        lag_days: 0
      });
      toast.success('Dependency added successfully');
    },
    onError: (error) => {
      toast.error('Failed to add dependency: ' + error.message);
    }
  });

  const deleteDependencyMutation = useMutation({
    mutationFn: async (dependencyId: string) => {
      const { error } = await supabase
        .from('task_dependencies')
        .delete()
        .eq('id', dependencyId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-dependencies', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-schedule', projectId] });
      toast.success('Dependency deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete dependency: ' + error.message);
    }
  });

  const handleAddDependency = () => {
    if (!newDependency.source_task_id || !newDependency.target_task_id) {
      toast.error('Please select both source and target tasks');
      return;
    }
    createDependencyMutation.mutate(newDependency);
  };

  const dependencyTypeLabels = {
    'finish_to_start': 'Finish to Start',
    'start_to_start': 'Start to Start',
    'finish_to_finish': 'Finish to Finish',
    'start_to_finish': 'Start to Finish'
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading dependencies...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add Task Dependency
          </CardTitle>
          <CardDescription>
            Create dependencies between tasks to define their execution order
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Select 
              value={newDependency.source_task_id} 
              onValueChange={(value) => setNewDependency({ ...newDependency, source_task_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Source task" />
              </SelectTrigger>
              <SelectContent>
                {tasks.map((task) => (
                  <SelectItem key={task.id} value={task.id}>
                    {task.task_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select 
              value={newDependency.dependency_type} 
              onValueChange={(value) => setNewDependency({ ...newDependency, dependency_type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(dependencyTypeLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select 
              value={newDependency.target_task_id} 
              onValueChange={(value) => setNewDependency({ ...newDependency, target_task_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Target task" />
              </SelectTrigger>
              <SelectContent>
                {tasks.map((task) => (
                  <SelectItem key={task.id} value={task.id}>
                    {task.task_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button 
              onClick={handleAddDependency}
              disabled={createDependencyMutation.isPending}
              className="w-full"
            >
              {createDependencyMutation.isPending ? 'Adding...' : 'Add Dependency'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Task Dependencies ({dependencies.length})</CardTitle>
          <CardDescription>
            Manage task dependencies and execution order
          </CardDescription>
        </CardHeader>
        <CardContent>
          {dependencies.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No dependencies created yet. Add your first dependency above.
            </div>
          ) : (
            <div className="space-y-3">
              {dependencies.map((dependency) => (
                <div 
                  key={dependency.id} 
                  className="flex items-center justify-between p-4 border rounded-lg bg-card"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{dependency.source_task?.task_name}</span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{dependency.target_task?.task_name}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      ({dependencyTypeLabels[dependency.dependency_type as keyof typeof dependencyTypeLabels]})
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteDependencyMutation.mutate(dependency.id)}
                    disabled={deleteDependencyMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}