import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Plus, User, Wrench } from 'lucide-react';
import { toast } from 'sonner';

interface ResourceManagementProps {
  projectId: string;
}

export function ResourceManagement({ projectId }: ResourceManagementProps) {
  const [newResource, setNewResource] = useState({
    resource_name: '',
    resource_type: 'person',
    email: '',
    hourly_rate: '',
    availability_percent: 100
  });

  const queryClient = useQueryClient();

  const { data: resources = [], isLoading } = useQuery({
    queryKey: ['project-resources', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_resources')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  const createResourceMutation = useMutation({
    mutationFn: async (resourceData: typeof newResource) => {
      const { data, error } = await supabase
        .from('project_resources')
        .insert({
          ...resourceData,
          project_id: projectId,
          hourly_rate: resourceData.hourly_rate ? parseFloat(resourceData.hourly_rate) : null
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-resources', projectId] });
      setNewResource({
        resource_name: '',
        resource_type: 'person',
        email: '',
        hourly_rate: '',
        availability_percent: 100
      });
      toast.success('Resource added successfully');
    },
    onError: (error) => {
      toast.error('Failed to add resource: ' + error.message);
    }
  });

  const deleteResourceMutation = useMutation({
    mutationFn: async (resourceId: string) => {
      const { error } = await supabase
        .from('project_resources')
        .delete()
        .eq('id', resourceId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-resources', projectId] });
      toast.success('Resource deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete resource: ' + error.message);
    }
  });

  const handleAddResource = () => {
    if (!newResource.resource_name.trim()) {
      toast.error('Resource name is required');
      return;
    }
    createResourceMutation.mutate(newResource);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading resources...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add New Resource
          </CardTitle>
          <CardDescription>
            Add team members, equipment, or other resources to this project
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Input
              placeholder="Resource name"
              value={newResource.resource_name}
              onChange={(e) => setNewResource({ ...newResource, resource_name: e.target.value })}
            />
            <Select 
              value={newResource.resource_type} 
              onValueChange={(value) => setNewResource({ ...newResource, resource_type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="person">Person</SelectItem>
                <SelectItem value="equipment">Equipment</SelectItem>
                <SelectItem value="material">Material</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Email (optional)"
              type="email"
              value={newResource.email}
              onChange={(e) => setNewResource({ ...newResource, email: e.target.value })}
            />
            <Input
              placeholder="Hourly rate"
              type="number"
              step="0.01"
              value={newResource.hourly_rate}
              onChange={(e) => setNewResource({ ...newResource, hourly_rate: e.target.value })}
            />
            <Button 
              onClick={handleAddResource}
              disabled={createResourceMutation.isPending}
              className="w-full"
            >
              {createResourceMutation.isPending ? 'Adding...' : 'Add Resource'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Project Resources ({resources.length})</CardTitle>
          <CardDescription>
            Manage all resources allocated to this project
          </CardDescription>
        </CardHeader>
        <CardContent>
          {resources.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No resources added yet. Add your first resource above.
            </div>
          ) : (
            <div className="space-y-3">
              {resources.map((resource) => (
                <div 
                  key={resource.id} 
                  className="flex items-center justify-between p-4 border rounded-lg bg-card"
                >
                  <div className="flex items-center gap-3">
                    {resource.resource_type === 'person' ? (
                      <User className="h-5 w-5 text-blue-500" />
                    ) : (
                      <Wrench className="h-5 w-5 text-green-500" />
                    )}
                    <div>
                      <div className="font-medium">{resource.resource_name}</div>
                      <div className="text-sm text-muted-foreground">
                        {resource.resource_type} • {resource.availability_percent}% available
                        {resource.hourly_rate && ` • $${resource.hourly_rate}/hr`}
                        {resource.email && ` • ${resource.email}`}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteResourceMutation.mutate(resource.id)}
                    disabled={deleteResourceMutation.isPending}
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