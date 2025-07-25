import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { EditEmployeeDialog } from "./EditEmployeeDialog";
import { DeleteButton } from "@/components/ui/delete-button";

interface Employee {
  id: string;
  home_builder_id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
  role: string;
  avatar_url?: string;
  confirmed: boolean;
  created_at: string;
  updated_at: string;
}

export function EmployeeTable() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  // Fetch employees - handle both home builders and employees
  const { data: employees = [], isLoading: employeesLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) return [];

      // Get current user's profile from unified users table
      const { data: currentUserProfile } = await supabase
        .from('users')
        .select('role, home_builder_id')
        .eq('id', currentUser.user.id)
        .maybeSingle();

      if (!currentUserProfile) return [];

      let homeBuilderIdToQuery = null;

      if (currentUserProfile.role === 'owner') {
        // User is an owner - get their employees
        homeBuilderIdToQuery = currentUser.user.id;
      } else if (currentUserProfile.role === 'employee' && currentUserProfile.home_builder_id) {
        // User is an employee - get all employees from same company
        homeBuilderIdToQuery = currentUserProfile.home_builder_id;
      }

      if (homeBuilderIdToQuery) {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('home_builder_id', homeBuilderIdToQuery)
          .eq('role', 'employee')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        return data as Employee[];
      }
      
      return [];
    },
  });

  // Delete employee mutation
  const deleteEmployeeMutation = useMutation({
    mutationFn: async (employeeId: string) => {
      console.log('Deleting employee with ID:', employeeId);
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', employeeId);
      
      if (error) {
        console.error('Error deleting employee:', error);
        throw error;
      }
      console.log('Employee deleted successfully');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast({
        title: "Success",
        description: "Employee deleted successfully",
      });
    },
    onError: (error) => {
      console.error('Delete employee mutation error:', error);
      toast({
        title: "Error",
        description: "Failed to delete employee",
        variant: "destructive",
      });
    },
  });

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
  };

  const getStatusBadge = (employee: Employee) => {
    if (employee.confirmed) {
      return <Badge className="bg-green-100 text-green-800">Confirmed</Badge>;
    } else {
      return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
    }
  };

  const handleEditEmployee = (employee: Employee) => {
    console.log('Editing employee:', employee);
    setEditingEmployee(employee);
  };

  const handleCloseDialog = () => {
    setEditingEmployee(null);
  };

  if (employeesLoading) {
    return <div className="p-6">Loading employees...</div>;
  }

  return (
    <>
      <div className="bg-white rounded-lg border shadow-sm">
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
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={employee.avatar_url || ''} />
                    <AvatarFallback>
                      {getInitials(employee.first_name, employee.last_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{employee.first_name} {employee.last_name}</div>
                    <div className="text-sm text-gray-500">
                      Added {new Date(employee.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </TableCell>
                <TableCell>{employee.email}</TableCell>
                <TableCell>{employee.phone_number || '-'}</TableCell>
                <TableCell>{employee.role}</TableCell>
                <TableCell>
                  {getStatusBadge(employee)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditEmployee(employee)}
                      className="hover:bg-gray-100"
                    >
                      <Edit className="h-4 w-4" />
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

            {employees.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                  No employees found. Start by adding your first employee.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <EditEmployeeDialog
        employee={editingEmployee}
        open={!!editingEmployee}
        onOpenChange={(open) => !open && handleCloseDialog()}
      />
    </>
  );
}