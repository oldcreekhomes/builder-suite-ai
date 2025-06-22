
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import HomeBuilderSelect from "./HomeBuilderSelect";

const SignupForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [userType, setUserType] = useState<"home_builder" | "employee" | "">("");
  const [homeBuildingCompany, setHomeBuildingCompany] = useState("");
  const [homeBuilderName, setHomeBuilderName] = useState("");
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
        metadata.company_name = homeBuildingCompany;
      } else if (userType === "employee") {
        metadata.home_builder_id = selectedHomeBuilderId;
      }

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: metadata,
        },
      });

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Please check your email to confirm your account!",
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
      
      <div className="space-y-2">
        <Label htmlFor="user-type">User Type</Label>
        <Select value={userType} onValueChange={(value: "home_builder" | "employee") => setUserType(value)}>
          <SelectTrigger>
            <SelectValue placeholder="Select user type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="home_builder">Home Builder</SelectItem>
            <SelectItem value="employee">Employee</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {userType === "home_builder" && (
        <div className="space-y-2">
          <Label htmlFor="home-building-company">Home building company</Label>
          <Input
            id="home-building-company"
            type="text"
            value={homeBuildingCompany}
            onChange={(e) => setHomeBuildingCompany(e.target.value)}
            required
            placeholder="Enter your home building company name"
          />
        </div>
      )}

      {userType === "employee" && (
        <HomeBuilderSelect 
          onSelect={(id, name) => {
            setSelectedHomeBuilderId(id);
            setHomeBuilderName(name);
          }}
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
      
      <Button type="submit" className="w-full" disabled={isLoading || !userType}>
        {isLoading ? "Creating account..." : "Create Account"}
      </Button>
    </form>
  );
};

export default SignupForm;
