
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
  first_name: string;
  last_name: string;
  email: string;
  phone_number?: string;
  role?: string;
  avatar_url?: string;
  user_type: string;
  approved_by_home_builder: boolean;
}

interface EmployeeInvitation {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number?: string;
  role: string;
  status: string;
  invited_at: string;
  confirmed_at?: string;
  expires_at: string;
}

export function EmployeeTable() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [editingInvitation, setEditingInvitation] = useState<EmployeeInvitation | null>(null);

  // Fetch existing employees
  const { data: employees = [], isLoading: employeesLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_type', 'employee')
        .eq('approved_by_home_builder', true);
      
      if (error) throw error;
      console.log('Employees from profiles table:', data);
      return data as Employee[];
    },
  });

  // Fetch pending invitations (exclude those that are already converted to employee profiles)
  const { data: allInvitations = [], isLoading: invitationsLoading } = useQuery({
    queryKey: ['all-employee-invitations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_invitations')
        .select('*')
        .order('invited_at', { ascending: false });
      
      if (error) throw error;
      return data as EmployeeInvitation[];
    },
  });

  // Filter out invitations that have corresponding employee profiles
  const invitations = allInvitations.filter(invitation => 
    !employees.some(employee => employee.email === invitation.email)
  );

  console.log('Employees length:', employees.length);
  console.log('All invitations length:', allInvitations.length);
  console.log('Filtered invitations length:', invitations.length);
  console.log('Employees emails:', employees.map(e => e.email));
  console.log('Invitation emails:', allInvitations.map(i => i.email));

  // Delete employee mutation
  const deleteEmployeeMutation = useMutation({
    mutationFn: async (employeeId: string) => {
      console.log('Deleting employee with ID:', employeeId);
      const { error } = await supabase
        .from('profiles')
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

  // Delete invitation mutation
  const deleteInvitationMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      console.log('Deleting invitation with ID:', invitationId);
      const { error } = await supabase
        .from('employee_invitations')
        .delete()
        .eq('id', invitationId);
      
      if (error) {
        console.error('Error deleting invitation:', error);
        throw error;
      }
      console.log('Invitation deleted successfully');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-invitations'] });
      toast({
        title: "Success",
        description: "Invitation deleted successfully",
      });
    },
    onError: (error) => {
      console.error('Delete invitation mutation error:', error);
      toast({
        title: "Error",
        description: "Failed to delete invitation",
        variant: "destructive",
      });
    },
  });

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
  };

  const getInvitationStatusColor = (invitation: EmployeeInvitation) => {
    const now = new Date();
    const expiresAt = new Date(invitation.expires_at);
    
    if (invitation.status === 'confirmed') {
      return 'bg-green-100 text-green-800';
    } else if (invitation.status === 'pending' && expiresAt < now) {
      return 'bg-red-100 text-red-800';
    } else if (invitation.status === 'pending') {
      return 'bg-yellow-100 text-yellow-800';
    }
    return 'bg-gray-100 text-gray-800';
  };

  const getInvitationStatusText = (invitation: EmployeeInvitation) => {
    const now = new Date();
    const expiresAt = new Date(invitation.expires_at);
    
    if (invitation.status === 'confirmed') {
      return 'Confirmed';
    } else if (invitation.status === 'pending' && expiresAt < now) {
      return 'Expired';
    } else if (invitation.status === 'pending') {
      return 'Pending';
    }
    return invitation.status;
  };

  const handleEditEmployee = (employee: Employee) => {
    console.log('Editing employee:', employee);
    setEditingEmployee(employee);
    setEditingInvitation(null);
  };

  const handleEditInvitation = (invitation: EmployeeInvitation) => {
    console.log('Editing invitation:', invitation);
    setEditingInvitation(invitation);
    setEditingEmployee(null);
  };

  const handleCloseDialog = () => {
    setEditingEmployee(null);
    setEditingInvitation(null);
  };

  if (employeesLoading || invitationsLoading) {
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
            {/* Active Employees */}
            {employees.map((employee) => (
              <TableRow key={`employee-${employee.id}`}>
                <TableCell className="flex items-center space-x-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={employee.avatar_url || ''} />
                    <AvatarFallback>
                      {getInitials(employee.first_name, employee.last_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{employee.first_name} {employee.last_name}</div>
                  </div>
                </TableCell>
                <TableCell>{employee.email}</TableCell>
                <TableCell>{employee.phone_number || '-'}</TableCell>
                <TableCell>{employee.role || 'Employee'}</TableCell>
                <TableCell>
                  <Badge className="bg-green-100 text-green-800">Active</Badge>
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

            {/* Pending/Confirmed Invitations */}
            {invitations.map((invitation) => (
              <TableRow key={`invitation-${invitation.id}`}>
                <TableCell className="flex items-center space-x-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>
                      {getInitials(invitation.first_name, invitation.last_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{invitation.first_name} {invitation.last_name}</div>
                    <div className="text-sm text-gray-500">
                      Invited {new Date(invitation.invited_at).toLocaleDateString()}
                      {invitation.confirmed_at && (
                        <span> • Confirmed {new Date(invitation.confirmed_at).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>{invitation.email}</TableCell>
                <TableCell>{invitation.phone_number || '-'}</TableCell>
                <TableCell>{invitation.role}</TableCell>
                <TableCell>
                  <Badge className={getInvitationStatusColor(invitation)}>
                    {getInvitationStatusText(invitation)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditInvitation(invitation)}
                      className="hover:bg-gray-100"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <DeleteButton
                      onDelete={() => deleteInvitationMutation.mutate(invitation.id)}
                      title="Delete Invitation"
                      description={`Are you sure you want to delete the invitation for ${invitation.first_name} ${invitation.last_name}? This action cannot be undone.`}
                      isLoading={deleteInvitationMutation.isPending}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}

            {employees.length === 0 && invitations.length === 0 && (
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
        invitation={editingInvitation}
        open={!!(editingEmployee || editingInvitation)}
        onOpenChange={(open) => !open && handleCloseDialog()}
      />
    </>
  );
}
