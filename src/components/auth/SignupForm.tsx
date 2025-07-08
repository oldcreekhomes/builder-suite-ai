
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import HomeBuilderSelect from "./HomeBuilderSelect";

const SignupForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [userType, setUserType] = useState<"home_builder" | "employee">("home_builder");
  const [companyName, setCompanyName] = useState("");
  const [selectedHomeBuilderId, setSelectedHomeBuilderId] = useState("");
  const [selectedHomeBuilderData, setSelectedHomeBuilderData] = useState<{id: string, company_name: string} | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const sendEmployeeApprovalEmails = async (employeeId: string, homeBuilderData: {id: string, company_name: string}) => {
    try {
      // Get home builder email
      const { data: homeBuilderProfile, error } = await supabase
        .from('owners')
        .select('email')
        .eq('id', homeBuilderData.id)
        .single();

      if (error || !homeBuilderProfile) {
        console.error("Error fetching home builder profile:", error);
        return;
      }

      const response = await supabase.functions.invoke('send-employee-approval-email', {
        body: {
          employeeId,
          employeeEmail: email,
          homeBuilderEmail: homeBuilderProfile.email,
          companyName: homeBuilderData.company_name,
        }
      });

      if (response.error) {
        console.error("Error sending approval emails:", response.error);
      } else {
        console.log("Approval emails sent successfully");
      }
    } catch (error) {
      console.error("Error in sendEmployeeApprovalEmails:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      console.log("Attempting signup with type:", userType);

      // Prepare metadata based on user type
      const metadata: Record<string, any> = {
        user_type: userType,
      };

      if (userType === "home_builder" && companyName.trim()) {
        metadata.company_name = companyName.trim();
      } else if (userType === "employee" && selectedHomeBuilderId) {
        metadata.home_builder_id = selectedHomeBuilderId;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: metadata
        }
      });

      if (error) {
        console.error("Signup error:", error);
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } else if (data.user) {
        console.log("Signup successful:", data.user);
        
        if (userType === "home_builder") {
          toast({
            title: "Account Created Successfully",
            description: "Please check your email to confirm your account.",
          });
        } else if (userType === "employee" && selectedHomeBuilderData) {
          // Send approval emails for employee
          await sendEmployeeApprovalEmails(data.user.id, selectedHomeBuilderData);
          
          toast({
            title: "Registration Submitted",
            description: "Please check your email to confirm your account. Your company will also need to approve your access.",
          });
        }
        
        // Don't navigate immediately, let them check email
      }
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-3">
        <Label>Account Type</Label>
        <RadioGroup 
          value={userType} 
          onValueChange={(value: "home_builder" | "employee") => setUserType(value)}
          className="flex flex-col space-y-2"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="home_builder" id="home_builder" />
            <Label htmlFor="home_builder">Home Building Company</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="employee" id="employee" />
            <Label htmlFor="employee">Employee</Label>
          </div>
        </RadioGroup>
      </div>

      <div className="space-y-2">
        <Label htmlFor="signup-email">Email</Label>
        <Input
          id="signup-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="Enter your email"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="signup-password">Password</Label>
        <Input
          id="signup-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          placeholder="Enter your password"
          minLength={6}
        />
      </div>

      {userType === "home_builder" && (
        <div className="space-y-2">
          <Label htmlFor="company-name">Company Name</Label>
          <Input
            id="company-name"
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            required
            placeholder="Enter your company name"
          />
        </div>
      )}

      {userType === "employee" && (
        <HomeBuilderSelect
          value={selectedHomeBuilderId}
          onChange={(value, homeBuilderData) => {
            setSelectedHomeBuilderId(value);
            setSelectedHomeBuilderData(homeBuilderData);
          }}
        />
      )}
      
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "Creating account..." : "Create Account"}
      </Button>
    </form>
  );
};

export default SignupForm;
