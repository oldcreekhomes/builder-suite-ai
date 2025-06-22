
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface PendingEmployee {
  id: string;
  email: string;
  created_at: string;
}

export function EmployeeApprovals() {
  const [pendingEmployees, setPendingEmployees] = useState<PendingEmployee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchPendingEmployees();
    }
  }, [user]);

  const fetchPendingEmployees = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.rpc('get_pending_employee_approvals', {
        home_builder_user_id: user.id
      });

      if (error) {
        console.error('Error fetching pending employees:', error);
        toast({
          title: "Error",
          description: "Failed to load pending employee approvals",
          variant: "destructive",
        });
      } else {
        setPendingEmployees(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const approveEmployee = async (employeeId: string) => {
    if (!user) return;

    try {
      const { data, error } = await supabase.rpc('approve_employee', {
        employee_id: employeeId,
        approver_id: user.id
      });

      if (error) {
        console.error('Error approving employee:', error);
        toast({
          title: "Error",
          description: "Failed to approve employee",
          variant: "destructive",
        });
      } else if (data) {
        toast({
          title: "Success",
          description: "Employee has been approved successfully",
        });
        // Refresh the list
        fetchPendingEmployees();
      } else {
        toast({
          title: "Error",
          description: "Failed to approve employee - insufficient permissions",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Employee Approvals</CardTitle>
          <CardDescription>Loading pending employee approvals...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pending Employee Approvals</CardTitle>
        <CardDescription>
          Review and approve employees who want to join your company
        </CardDescription>
      </CardHeader>
      <CardContent>
        {pendingEmployees.length === 0 ? (
          <p className="text-gray-500">No pending employee approvals</p>
        ) : (
          <div className="space-y-4">
            {pendingEmployees.map((employee) => (
              <div key={employee.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">{employee.email}</p>
                  <p className="text-sm text-gray-500">
                    Requested: {new Date(employee.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Button
                  onClick={() => approveEmployee(employee.id)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Approve
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
