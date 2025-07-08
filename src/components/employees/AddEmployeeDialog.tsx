import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AddEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddEmployeeDialog({ open, onOpenChange }: AddEmployeeDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    role: "employee",
    confirmed: false,
  });

  const addEmployeeMutation = useMutation({
    mutationFn: async () => {
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) throw new Error("User not authenticated");

      // Create the employee in the employees table
      const { data, error } = await supabase
        .from('employees')
        .insert({
          id: crypto.randomUUID(), // Generate a UUID for non-auth employees
          home_builder_id: currentUser.user.id,
          email: formData.email,
          first_name: formData.firstName,
          last_name: formData.lastName,
          phone_number: formData.phoneNumber || null,
          role: formData.role,
          confirmed: formData.confirmed,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating employee:', error);
        throw error;
      }

      console.log("Employee created:", data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast({
        title: "Success",
        description: "Employee added successfully",
      });
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        phoneNumber: "",
        role: "employee",
        confirmed: false,
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      console.error('Add employee error:', error);
      
      // Handle unique constraint violation (duplicate email)
      if (error.code === '23505') {
        toast({
          title: "Error",
          description: "An employee with this email already exists",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to add employee",
          variant: "destructive",
        });
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName || !formData.email) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    addEmployeeMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Employee</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phoneNumber">Phone Number</Label>
            <Input
              id="phoneNumber"
              type="tel"
              value={formData.phoneNumber}
              onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select
              value={formData.role}
              onValueChange={(value) => setFormData({ ...formData, role: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="employee">Employee</SelectItem>
                <SelectItem value="accountant">Accountant</SelectItem>
                <SelectItem value="construction_manager">Construction Manager</SelectItem>
                <SelectItem value="project_manager">Project Manager</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="confirmed"
              checked={formData.confirmed}
              onCheckedChange={(checked) => setFormData({ ...formData, confirmed: checked })}
            />
            <Label htmlFor="confirmed">Mark as Confirmed</Label>
          </div>
          <p className="text-sm text-gray-500">
            You can confirm employees later when they join your team
          </p>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={addEmployeeMutation.isPending}
            >
              {addEmployeeMutation.isPending ? "Adding Employee..." : "Add Employee"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}