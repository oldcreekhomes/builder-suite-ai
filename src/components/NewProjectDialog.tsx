import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useCompanyUsers } from "@/hooks/useCompanyUsers";
import { supabase } from "@/integrations/supabase/client";
import { AddressAutocomplete } from "./AddressAutocomplete";

interface NewProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statuses = ["In Design", "Permitting", "Under Construction", "Completed", "Template"];

export function NewProjectDialog({ open, onOpenChange }: NewProjectDialogProps) {
  const [projectName, setProjectName] = useState("");
  const [status, setStatus] = useState("");
  const [manager, setManager] = useState(""); // This will store the user ID
  const [address, setAddress] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const { users, isLoading: usersLoading } = useCompanyUsers();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submitted - Create Project button is working!");
    
    if (!projectName || !status || !manager || !address) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to create a project",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Determine the correct owner_id based on user role
      let owner_id = user.id;
      if (profile && profile.role === 'employee' && profile.home_builder_id) {
        // User is an employee, use their home_builder_id as the project owner
        owner_id = profile.home_builder_id;
      }


      const { data: project, error } = await supabase
        .from('projects')
        .insert({
          name: projectName,
          address,
          status,
          manager: manager, // Store the user ID
          owner_id,
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating project:", error);
        toast({
          title: "Error",
          description: "Failed to create project. Please try again.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Project created successfully!",
      });

      // Reset form
      setProjectName("");
      setStatus("");
      setManager("");
      setAddress("");
      onOpenChange(false);

      // Navigate to project dashboard
      navigate(`/project/${project.id}`);
    } catch (error) {
      console.error("Unexpected error:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  console.log("NewProjectDialog rendering, isLoading:", isLoading);
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
          <DialogDescription>
            Fill in the details to create a new construction project.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="projectName">Project Name</Label>
            <Input
              id="projectName"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Enter project name"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={setStatus} disabled={isLoading}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {statuses.map((statusOption) => (
                  <SelectItem key={statusOption} value={statusOption}>
                    {statusOption}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="manager">Manager</Label>
            <Select value={manager} onValueChange={setManager} disabled={isLoading || usersLoading}>
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
            <Label htmlFor="address">Address</Label>
            <AddressAutocomplete
              id="address"
              value={address}
              onChange={setAddress}
              placeholder="Enter project address"
              disabled={isLoading}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', paddingTop: '16px', width: '100%' }}>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              style={{ flex: 1 }}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading}
              style={{ 
                flex: 1, 
                backgroundColor: 'red', 
                color: 'white',
                border: '2px solid blue'
              }}
              onMouseEnter={() => console.log("Create Project button hovered!")}
              onClick={() => console.log("Create Project button clicked!")}
            >
              {isLoading ? "Creating..." : "CREATE PROJECT"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
