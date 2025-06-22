
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Employee {
  id: string;
  email: string;
  created_at: string;
}

interface EmployeeApprovalCardProps {
  employee: Employee;
  companyName: string;
  onApproval: () => void;
}

const EmployeeApprovalCard = ({ employee, companyName, onApproval }: EmployeeApprovalCardProps) => {
  const [isApproving, setIsApproving] = useState(false);
  const { toast } = useToast();

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      const { error } = await supabase.rpc('approve_employee', {
        employee_id: employee.id
      });

      if (error) {
        toast({
          title: "Error",
          description: "Failed to approve employee",
          variant: "destructive",
        });
      } else {
        // Send approval email
        await supabase.functions.invoke('send-employee-approved-email', {
          body: {
            employeeEmail: employee.email,
            companyName: companyName,
          }
        });

        toast({
          title: "Employee Approved",
          description: `${employee.email} has been approved and notified.`,
        });
        
        onApproval();
      }
    } catch (error) {
      console.error("Error approving employee:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsApproving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Pending Employee Approval</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p><strong>Email:</strong> {employee.email}</p>
          <p><strong>Requested:</strong> {new Date(employee.created_at).toLocaleDateString()}</p>
        </div>
        <Button 
          onClick={handleApprove} 
          disabled={isApproving}
          className="w-full"
        >
          {isApproving ? "Approving..." : "Approve Employee"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default EmployeeApprovalCard;
