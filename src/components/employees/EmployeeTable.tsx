import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { DeleteButton } from "@/components/ui/delete-button";
import { EditEmployeeDialog } from "./EditEmployeeDialog";

interface Employee {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone_number: string | null;
  role: string;
  confirmed: boolean;
  created_at: string;
  home_builder_id: string | null;
  updated_at: string;
}

export function EmployeeTable() {
  const { toast } = useToast();
  const { user } = useAuth();
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
        // Home builders see their employees
        query = query.eq('home_builder_id', user.id);
      } else if (currentUser.role === 'employee' && currentUser.home_builder_id) {
        // Employees see other employees in their company
        query = query.eq('home_builder_id', currentUser.home_builder_id);
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
      // First delete from auth.users using admin client (this should be done via edge function for production)
      const { error: authError } = await supabase.auth.admin.deleteUser(employeeId);
      
      if (authError && !authError.message.includes('User not found')) {
        console.error('Error deleting from auth.users:', authError);
        throw new Error('Failed to delete employee from authentication system');
      }

      // Delete from public.users table
      const { error: dbError } = await supabase
        .from('users')
        .delete()
        .eq('id', employeeId);

      if (dbError) {
        console.error('Error deleting from public.users:', dbError);
        throw new Error('Failed to delete employee from database');
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
                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditEmployee(employee)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <DeleteButton
                      onDelete={() => deleteEmployeeMutation.mutate(employee.id)}
                      title="Delete Employee"
                      description={`Are you sure you want to delete ${employee.first_name} ${employee.last_name}? This action cannot be undone.`}
                      isLoading={deleteEmployeeMutation.isPending}
                    />
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
    </>
  );
}