
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
import { LotManagementSection } from "@/components/LotManagementSection";

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
    address: "",
    status: "",
    construction_manager: "no-manager",
    accounting_manager: "no-manager",
  });

  // Update form data when project changes
  useEffect(() => {
    if (project) {
      setFormData({
        address: project.address,
        status: project.status,
        construction_manager: project.construction_manager || "no-manager",
        accounting_manager: project.accounting_manager || "no-manager",
      });
    }
  }, [project]);

  const updateProjectMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!project) return;
      
      const updatePayload = {
        address: data.address,
        status: data.status,
        construction_manager: data.construction_manager === "no-manager" ? null : data.construction_manager,
        accounting_manager: data.accounting_manager === "no-manager" ? null : data.accounting_manager,
      };
      
      const { error } = await supabase
        .from('projects')
        .update(updatePayload)
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
    onError: (error: any) => {
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
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Edit Project</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
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

          {/* Lot Management Section */}
          {project && <LotManagementSection projectId={project.id} />}

          <div className="flex justify-end space-x-2 pt-2">
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
