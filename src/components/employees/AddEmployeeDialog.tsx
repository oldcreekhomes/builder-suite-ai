import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface AddEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddEmployeeDialog({ open, onOpenChange }: AddEmployeeDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    role: "accountant",
  });

  const inviteEmployeeMutation = useMutation({
    mutationFn: async () => {
      // Create the invitation
      const { data: invitationId, error } = await supabase.rpc('invite_employee', {
        p_email: formData.email,
        p_first_name: formData.firstName,
        p_last_name: formData.lastName,
        p_phone_number: formData.phoneNumber || null,
        p_role: formData.role,
      });

      if (error) throw error;

      // Get the invitation details including token
      const { data: invitation, error: invitationError } = await supabase
        .from('employee_invitations')
        .select('*, home_builder_id')
        .eq('id', invitationId)
        .single();

      if (invitationError) throw invitationError;

      // Get company name for the email
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('company_name')
        .eq('id', invitation.home_builder_id)
        .single();

      if (profileError) throw profileError;

      // Send invitation email
      const { error: emailError } = await supabase.functions.invoke('send-employee-invitation', {
        body: {
          email: formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName,
          companyName: profile.company_name,
          invitationToken: invitation.invitation_token,
        }
      });

      if (emailError) {
        console.error('Email sending error:', emailError);
        // Don't throw here - invitation was created successfully, just email failed
        toast({
          title: "Invitation Created",
          description: "Invitation was created but email failed to send. Please contact the employee directly.",
          variant: "destructive",
        });
      }

      return { invitationId, emailSent: !emailError };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['employee-invitations'] });
      toast({
        title: "Success",
        description: result.emailSent 
          ? "Employee invitation sent successfully via email"
          : "Employee invitation created (email delivery failed)",
      });
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        phoneNumber: "",
        role: "accountant",
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send invitation",
        variant: "destructive",
      });
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
    inviteEmployeeMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite New Employee</DialogTitle>
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
                <SelectItem value="accountant">Accountant</SelectItem>
                <SelectItem value="construction_manager">Construction Manager</SelectItem>
                <SelectItem value="project_manager">Project Manager</SelectItem>
              </SelectContent>
            </Select>
          </div>

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
              disabled={inviteEmployeeMutation.isPending}
            >
              {inviteEmployeeMutation.isPending ? "Sending Invitation..." : "Send Invitation"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
