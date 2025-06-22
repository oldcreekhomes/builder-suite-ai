
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import HomeBuilderSelect from "./HomeBuilderSelect";

const SignupForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [userType, setUserType] = useState<"home_builder" | "employee">("home_builder");
  const [companyName, setCompanyName] = useState("");
  const [selectedHomeBuilderId, setSelectedHomeBuilderId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const metadata: any = {
        user_type: userType,
      };

      if (userType === "home_builder") {
        metadata.company_name = companyName;
      } else {
        metadata.home_builder_id = selectedHomeBuilderId;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
          emailRedirectTo: `${window.location.origin}/`
        }
      });

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } else if (data.user) {
        toast({
          title: "Account Created Successfully",
          description: userType === "employee" 
            ? "Your account has been created and is pending approval from your home builder."
            : "You can now sign in to your account.",
        });
        navigate("/");
      }
    } catch (error) {
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
    <form onSubmit={handleSubmit} className="space-y-4">
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

      <div className="space-y-3">
        <Label>User Type</Label>
        <RadioGroup 
          value={userType} 
          onValueChange={(value: "home_builder" | "employee") => setUserType(value)}
          className="flex flex-col space-y-2"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="home_builder" id="home_builder" />
            <Label htmlFor="home_builder">Home Builder</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="employee" id="employee" />
            <Label htmlFor="employee">Employee</Label>
          </div>
        </RadioGroup>
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
          onChange={setSelectedHomeBuilderId}
        />
      )}
      
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
      
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "Creating account..." : "Create Account"}
      </Button>
    </form>
  );
};

export default SignupForm;
