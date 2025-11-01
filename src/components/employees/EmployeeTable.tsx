import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Pencil, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { DeleteButton } from "@/components/ui/delete-button";
import { EditEmployeeDialog } from "./EditEmployeeDialog";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Employee {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone_number: string | null;
  avatar_url: string | null;
  role: string;
  confirmed: boolean;
  created_at: string;
  home_builder_id: string | null;
  updated_at: string;
}

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

  const getInitials = (firstName: string | null, lastName: string | null) => {
    const first = firstName?.[0] || '';
    const last = lastName?.[0] || '';
    return (first + last).toUpperCase() || 'U';
  };

  const getStatusBadge = (employee: Employee) => {
    if (employee.confirmed) {
      return <Badge variant="secondary">Active</Badge>;
    } else {
      return <Badge variant="outline">Pending Invitation</Badge>;
    }
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
    <TooltipProvider>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.map((employee) => (
              <TableRow key={employee.id}>
                <TableCell className="flex items-center space-x-3">
                  <Avatar>
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
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2 min-w-[120px]">
                    {/* View (Eye) slot: owner sees button, others keep placeholder to preserve layout */}
                    {isOwner ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewAsUser(employee)}
                            disabled={!employee.confirmed || employee.id === realUser?.id}
                            aria-label="View as user"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {employee.id === realUser?.id
                            ? "Cannot view as yourself"
                            : !employee.confirmed
                            ? "Cannot view as pending user"
                            : "View application as this user"}
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <span className="inline-flex h-10 w-10" aria-hidden="true" />
                    )}

                    {/* Edit slot: always visible */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditEmployee(employee)}
                      aria-label="Edit employee"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>

                    {/* Delete slot: owner sees button (not for self), others keep placeholder */}
                    {isOwner && employee.id !== user?.id ? (
                      <DeleteButton
                        onDelete={() => deleteEmployeeMutation.mutate(employee.id)}
                        title="Delete Employee"
                        description={`Are you sure you want to delete ${employee.first_name} ${employee.last_name}? This action cannot be undone.`}
                        isLoading={deleteEmployeeMutation.isPending}
                        size="icon"
                        variant="ghost"
                      />
                    ) : (
                      <span className="inline-flex h-10 w-10" aria-hidden="true" />
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {editingEmployee && (
        <EditEmployeeDialog
          employee={editingEmployee}
          open={!!editingEmployee}
          onOpenChange={handleCloseDialog}
        />
      )}
    </TooltipProvider>
  );
}