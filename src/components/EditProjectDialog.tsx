
import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCompanyUsers } from "@/hooks/useCompanyUsers";
import { Project } from "@/hooks/useProjects";

interface EditProjectDialogProps {
  project: Project | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditProjectDialog({ project, open, onOpenChange }: EditProjectDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { users, isLoading: usersLoading } = useCompanyUsers();
  
  const [formData, setFormData] = useState({
    name: project?.name || "",
    address: project?.address || "",
    status: project?.status || "In Design",
    manager: project?.manager || "", // This stores the user ID
    total_lots: project?.total_lots?.toString() || "",
  });

  // Update form data when project changes
  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name,
        address: project.address,
        status: project.status,
        manager: project.manager || "", // Use the manager UUID
        total_lots: project.total_lots?.toString() || "",
      });
    }
  }, [project]);

  const updateProjectMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!project) return;
      
      // Find the selected manager's details for the manager_name field
      const selectedUser = users.find(u => u.id === data.manager);
      const managerName = selectedUser 
        ? `${selectedUser.first_name || ''} ${selectedUser.last_name || ''}`.trim()
        : '';
      
      const { error } = await supabase
        .from('projects')
        .update({
          name: data.name,
          address: data.address,
          status: data.status,
          manager: data.manager, // Store the user ID
          total_lots: data.total_lots ? parseInt(data.total_lots) : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', project.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast({
        title: "Success",
        description: "Project updated successfully",
      });
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update project",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProjectMutation.mutate(formData);
  };

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Project</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Project Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => handleChange('address', e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="manager">Manager</Label>
              <Select 
                value={formData.manager} 
                onValueChange={(value) => handleChange('manager', value)}
                disabled={usersLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={usersLoading ? "Loading users..." : "Select manager"} />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {`${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="total_lots">Total Lots</Label>
              <Input
                id="total_lots"
                type="number"
                value={formData.total_lots}
                onChange={(e) => handleChange('total_lots', e.target.value)}
                placeholder="0"
                min="0"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={formData.status} onValueChange={(value) => handleChange('status', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="In Design">In Design</SelectItem>
                <SelectItem value="Permitting">Permitting</SelectItem>
                <SelectItem value="Under Construction">Under Construction</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end space-x-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={updateProjectMutation.isPending}
            >
              {updateProjectMutation.isPending ? "Updating..." : "Update Project"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
