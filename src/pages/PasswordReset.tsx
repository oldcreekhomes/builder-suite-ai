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
  const [email, setEmail] = useState("");
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if we have a custom reset token
    const token = searchParams.get('token');
    
    console.log("Password reset page loaded with token:", !!token);
    
    if (token) {
      try {
        const resetData = JSON.parse(atob(token));
        console.log("Decoded reset data:", { email: resetData.email, expires: new Date(resetData.expires) });
        
        // Check if token is expired
        if (Date.now() > resetData.expires) {
          toast({
            title: "Error",
            description: "Reset link has expired. Please request a new password reset.",
            variant: "destructive",
          });
          navigate('/auth');
          return;
        }
        
        // Set the email from the token
        setEmail(resetData.email);
      } catch (error) {
        console.error("Error decoding reset token:", error);
        toast({
          title: "Error",
          description: "Invalid reset link. Please request a new password reset.",
          variant: "destructive",
        });
        navigate('/auth');
      }
    } else {
      // If no token, redirect to auth page
      console.log("No token found, redirecting to auth");
      navigate('/auth');
    }
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
      // First sign in the user with their current credentials would be complex
      // Instead, let's use the admin API to update their password directly
      const token = searchParams.get('token');
      const resetData = JSON.parse(atob(token!));
      
      // Call our edge function to reset the password
      const { data, error } = await supabase.functions.invoke('reset-user-password', {
        body: JSON.stringify({ 
          email: resetData.email, 
          newPassword: password,
          resetToken: token 
        })
      });

      if (error) {
        console.error("Password reset error:", error);
        toast({
          title: "Error",
          description: "Failed to reset password. Please try again.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Your password has been updated successfully! Please sign in with your new password.",
        });
        // Redirect to auth page for sign in
        navigate("/auth");
      }
    } catch (error) {
      console.error("Password update error:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Welcome to BuilderSuite AI
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Reset your password to access your account
          </p>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Reset Password</CardTitle>
            <CardDescription>
              Enter your new password below
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
                {isLoading ? "Updating Password..." : "Update Password"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PasswordReset;