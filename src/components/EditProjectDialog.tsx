
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
    name: "",
    address: "",
    status: "",
    construction_manager: "no-manager", // Default to "no-manager"
    accounting_manager: "no-manager", // Default to "no-manager"
    total_lots: "",
  });

  // Update form data when project changes
  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name,
        address: project.address,
        status: project.status,
        construction_manager: project.construction_manager || "no-manager", // Use the construction manager UUID or "no-manager"
        accounting_manager: project.accounting_manager || "no-manager", // Use the accounting manager UUID or "no-manager"
        total_lots: project.total_lots?.toString() || "",
      });
    }
  }, [project]);

  const updateProjectMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!project) return;
      
      console.log('Updating project with data:', data);
      
        const updatePayload = {
          name: data.name,
          address: data.address,
          status: data.status,
          construction_manager: data.construction_manager === "no-manager" ? null : data.construction_manager, // Convert "no-manager" back to null
          accounting_manager: data.accounting_manager === "no-manager" ? null : data.accounting_manager, // Convert "no-manager" back to null
          total_lots: parseInt(data.total_lots, 10),
        };
      
      console.log('Sending update data to database:', updatePayload);
      
      const { error } = await supabase
        .from('projects')
        .update(updatePayload)
        .eq('id', project.id);

      if (error) {
        console.error('Database update error:', error);
        throw error;
      }
      
      console.log('Project updated successfully');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['totalLots'] });
      toast({
        title: "Success",
        description: "Project updated successfully",
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      console.error('Update mutation error:', error);
      toast({
        title: "Error",
        description: `Failed to update project: ${error?.message || 'Unknown error'}`,
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
                <Label htmlFor="constructionManager">Construction Manager</Label>
                <Select
                  value={formData.construction_manager}
                  onValueChange={(value) => handleChange("construction_manager", value)}
                  disabled={updateProjectMutation.isPending || usersLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={usersLoading ? "Loading users..." : "Select construction manager"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no-manager">No Construction Manager</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {`${user.first_name || ""} ${user.last_name || ""}`.trim() || user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="accountingManager">Accounting Manager</Label>
                <Select
                  value={formData.accounting_manager}
                  onValueChange={(value) => handleChange("accounting_manager", value)}
                  disabled={updateProjectMutation.isPending || usersLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={usersLoading ? "Loading users..." : "Select accounting manager"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no-manager">No Accounting Manager</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {`${user.first_name || ""} ${user.last_name || ""}`.trim() || user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="total_lots">Total Lots</Label>
              <Input
                id="total_lots"
                type="number"
                value={formData.total_lots}
                onChange={(e) => handleChange('total_lots', e.target.value)}
                placeholder="Enter total lots"
                min="0"
                className="[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
              />
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
