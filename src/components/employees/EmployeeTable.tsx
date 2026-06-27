import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { EditEmployeeDialog } from "./EditEmployeeDialog";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { TableRowActions } from "@/components/ui/table-row-actions";
import { SettingsTableWrapper } from "@/components/ui/settings-table-wrapper";
import { SeatChangeConfirmDialog } from "./SeatChangeConfirmDialog";

interface Employee {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone_number: string | null;
  avatar_url: string | null;
  role: string;
  confirmed: boolean;
  access_revoked: boolean;
  pending_removal_at: string | null;
  created_at: string;
  home_builder_id: string | null;
  updated_at: string;
}

const fmtDate = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
    : "";

export function EmployeeTable() {
  const { toast } = useToast();
  const { user, realUser } = useAuth();
  const { isOwner } = useUserRole();
  const { startImpersonation } = useImpersonation();
  const queryClient = useQueryClient();
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees', user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Get current user's role and home builder ID
      const { data: currentUser } = await supabase
        .from('users')
        .select('role, home_builder_id')
        .eq('id', user.id)
        .single();

      if (!currentUser) return [];

      let query = supabase.from('users').select('*');

      if (currentUser.role === 'owner') {
        // Owners see themselves AND their internal users
        query = query.or(`id.eq.${user.id},home_builder_id.eq.${user.id}`);
      } else if (currentUser.home_builder_id) {
        // Internal users see their owner and other internal users in their company
        query = query.or(`id.eq.${currentUser.home_builder_id},home_builder_id.eq.${currentUser.home_builder_id}`);
      } else {
        return [];
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching employees:', error);
        return [];
      }

      return data || [];
    },
    enabled: !!user,
  });

  const deleteEmployeeMutation = useMutation({
    mutationFn: async (employeeId: string) => {
      // Call the edge function to delete the employee with admin privileges
      const { data, error } = await supabase.functions.invoke('delete-employee', {
        body: { employeeId }
      });

      if (error) {
        console.error('Error calling delete-employee function:', error);
        throw new Error(error.message || 'Failed to delete employee. Please try again.');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      if (!data?.success) {
        throw new Error('Failed to delete employee');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast({
        title: "Employee deleted",
        description: "The employee has been successfully removed.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting employee",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const revokeAccessMutation = useMutation({
    mutationFn: async (employeeId: string) => {
      const { data, error } = await supabase.functions.invoke('revoke-employee-access', {
        body: { employeeId },
      });
      if (error) throw new Error(error.message || 'Failed to revoke access.');
      if (data?.error) throw new Error(data.error);
      if (!data?.success) throw new Error('Failed to revoke access');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast({ title: "Access revoked", description: "The employee has been signed out everywhere and can no longer log in." });
    },
    onError: (error: Error) => {
      toast({ title: "Error revoking access", description: error.message, variant: "destructive" });
    },
  });

  const restoreAccessMutation = useMutation({
    mutationFn: async (employeeId: string) => {
      const { data, error } = await supabase.functions.invoke('restore-employee-access', {
        body: { employeeId },
      });
      if (error) throw new Error(error.message || 'Failed to restore access.');
      if (data?.error) throw new Error(data.error);
      if (!data?.success) throw new Error('Failed to restore access');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast({ title: "Access restored", description: "The employee can log in again." });
    },
    onError: (error: Error) => {
      toast({ title: "Error restoring access", description: error.message, variant: "destructive" });
    },
  });

  const getInitials = (firstName: string | null, lastName: string | null) => {
    const first = firstName?.[0] || '';
    const last = lastName?.[0] || '';
    return (first + last).toUpperCase() || 'U';
  };

  const getStatusBadge = (employee: Employee) => {
    if (employee.access_revoked) {
      return <Badge variant="destructive">Revoked</Badge>;
    }
    if (employee.confirmed) {
      return <Badge variant="secondary">Active</Badge>;
    }
    return <Badge variant="outline">Pending Invitation</Badge>;
  };

  const handleEditEmployee = (employee: Employee) => {
    setEditingEmployee(employee);
  };

  const handleCloseDialog = () => {
    setEditingEmployee(null);
  };

  const handleViewAsUser = async (employee: Employee) => {
    if (!isOwner) {
      toast({
        title: "Permission Denied",
        description: "Only owners can impersonate users.",
        variant: "destructive",
      });
      return;
    }

    if (!employee.confirmed) {
      toast({
        title: "Cannot Impersonate",
        description: "Cannot impersonate users with pending invitations.",
        variant: "destructive",
      });
      return;
    }

    if (employee.id === realUser?.id) {
      toast({
        title: "Cannot Impersonate",
        description: "You cannot impersonate yourself.",
        variant: "destructive",
      });
      return;
    }

    await startImpersonation(employee.id);
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading employees...</div>;
  }

  if (employees.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No employees found. Add your first employee to get started.</p>
      </div>
    );
  }

  return (
    <>
      <SettingsTableWrapper>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.map((employee) => (
              <TableRow key={employee.id}>
                <TableCell className="flex items-center space-x-3">
                  <Avatar className="h-6 w-6 text-xs">
                    <AvatarImage src={employee.avatar_url || undefined} alt={`${employee.first_name} ${employee.last_name}`} />
                    <AvatarFallback>
                      {getInitials(employee.first_name, employee.last_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">
                      {employee.first_name && employee.last_name
                        ? `${employee.first_name} ${employee.last_name}`
                        : employee.email}
                    </div>
                  </div>
                </TableCell>
                <TableCell>{employee.email}</TableCell>
                <TableCell>{employee.phone_number || 'N/A'}</TableCell>
                <TableCell className="capitalize">
                  {employee.role.replace('_', ' ')}
                </TableCell>
                <TableCell>{getStatusBadge(employee)}</TableCell>
                <TableCell className="text-center">
                  <div className="flex justify-center">
                    <TableRowActions actions={[
                      { label: "View as User", onClick: () => handleViewAsUser(employee), hidden: !isOwner || employee.access_revoked, disabled: !employee.confirmed || employee.id === realUser?.id },
                      { label: "Edit", onClick: () => handleEditEmployee(employee) },
                      { label: "Delete", onClick: () => deleteEmployeeMutation.mutate(employee.id), variant: "destructive", requiresConfirmation: true, confirmTitle: "Delete Employee", confirmDescription: `Are you sure you want to delete ${employee.first_name} ${employee.last_name}? This action cannot be undone.`, isLoading: deleteEmployeeMutation.isPending, hidden: !isOwner || employee.id === user?.id },
                      { label: "Revoke Access", onClick: () => revokeAccessMutation.mutate(employee.id), variant: "destructive", requiresConfirmation: true, confirmTitle: "Revoke Access", confirmLabel: "Revoke Access", confirmDescription: `${employee.first_name} ${employee.last_name} will be signed out of every device immediately and unable to log in again. All historical data is preserved. You can restore access later if needed.`, isLoading: revokeAccessMutation.isPending, hidden: !isOwner || employee.id === user?.id || employee.access_revoked },
                      { label: "Make Active", onClick: () => restoreAccessMutation.mutate(employee.id), isLoading: restoreAccessMutation.isPending, hidden: !isOwner || !employee.access_revoked },
                    ]} />

                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </SettingsTableWrapper>

      {editingEmployee && (
        <EditEmployeeDialog
          employee={editingEmployee}
          open={!!editingEmployee}
          onOpenChange={handleCloseDialog}
        />
      )}
    </>
  );
}