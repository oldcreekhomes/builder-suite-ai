import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const PasswordReset = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthState = async () => {
      // Check for various possible URL parameter formats from Supabase
      const urlParams = new URLSearchParams(window.location.search);
      const fragment = new URLSearchParams(window.location.hash.substring(1));
      
      // Check URL params first (standard format)
      let type = searchParams.get('type');
      let accessToken = searchParams.get('access_token');
      let refreshToken = searchParams.get('refresh_token');
      
      // Check fragment params (alternative format)
      if (!accessToken && !refreshToken) {
        type = fragment.get('type') || type;
        accessToken = fragment.get('access_token');
        refreshToken = fragment.get('refresh_token');
      }
      
      console.log("Password reset page loaded with params:", { 
        type, 
        hasAccessToken: !!accessToken, 
        hasRefreshToken: !!refreshToken,
        searchParams: Object.fromEntries(searchParams.entries()),
        fragmentParams: Object.fromEntries(fragment.entries())
      });
      
      // If we have tokens, try to set the session
      if (accessToken && refreshToken) {
        try {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          
          if (error) {
            throw error;
          }
          
          console.log("Session set successfully from recovery tokens");
          return;
        } catch (error) {
          console.error("Error setting session from recovery tokens:", error);
          toast({
            title: "Error",
            description: "Invalid recovery session. Please request a new password reset.",
            variant: "destructive",
          });
          navigate('/auth');
          return;
        }
      }
      
      // If no tokens but we have a type=recovery, check current session
      if (type === 'recovery') {
        try {
          const { data: { session }, error } = await supabase.auth.getSession();
          if (error) throw error;
          
          if (session) {
            console.log("Using existing session for password reset");
            return;
          }
        } catch (error) {
          console.error("Error getting session:", error);
        }
      }
      
      // If we get here, show error
      console.log("No valid recovery session found");
      toast({
        title: "Error",
        description: "Invalid or expired reset link. Please request a new password reset.",
        variant: "destructive",
      });
      navigate('/auth');
    };

    handleAuthState();
  }, [searchParams, navigate, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password || !confirmPassword) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters long",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      console.log("Updating password with Supabase auth");
      
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Success",
        description: isEmployeeInvitation 
          ? "Your account has been set up successfully! Welcome to BuilderSuite AI." 
          : "Your password has been updated successfully! Redirecting to dashboard...",
      });
      
      // User is now authenticated with the new password, redirect to main app
      navigate("/");
    } catch (error: any) {
      console.error("Password update error:", error);
      toast({
        title: "Error",
        description: error.message || "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Check if this is an employee invitation flow
  const isEmployeeInvitation = searchParams.get('type') === 'recovery';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Welcome to BuilderSuite AI
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {isEmployeeInvitation ? "Set up your password to access your account" : "Reset your password to access your account"}
          </p>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>{isEmployeeInvitation ? "Set Your Password" : "Reset Password"}</CardTitle>
            <CardDescription>
              {isEmployeeInvitation ? "Create your password to complete your account setup" : "Enter your new password below"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter your new password"
                  disabled={isLoading}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Confirm your new password"
                  disabled={isLoading}
                />
              </div>
              
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (isEmployeeInvitation ? "Setting Up Account..." : "Updating Password...") : (isEmployeeInvitation ? "Set Password & Continue" : "Update Password")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PasswordReset;