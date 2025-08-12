
import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LoginForm from "@/components/auth/LoginForm";
import SignupForm from "@/components/auth/SignupForm";

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Check if this is a password recovery flow
    const type = searchParams.get('type');
    const token = searchParams.get('token');
    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');
    
    console.log("Auth page loaded with params:", { type, hasToken: !!token, hasAccessToken: !!accessToken, hasRefreshToken: !!refreshToken });
    
    // Handle Supabase recovery flow
    if (type === 'recovery') {
      if (accessToken && refreshToken) {
        console.log("Recovery completed with tokens, redirecting to password reset page...");
        // Recovery flow completed, redirect to password reset page
        navigate(`/reset-password?${searchParams.toString()}`, { replace: true });
      } else if (token) {
        console.log("Processing recovery token with Supabase...");
        // Wait a bit for Supabase to process the token exchange
        const checkForTokens = () => {
          const urlParams = new URLSearchParams(window.location.search);
          const newAccessToken = urlParams.get('access_token');
          const newRefreshToken = urlParams.get('refresh_token');
          
          if (newAccessToken && newRefreshToken) {
            console.log("Tokens received after processing, redirecting...");
            navigate(`/reset-password?${urlParams.toString()}`, { replace: true });
          } else {
            // If tokens don't appear within 3 seconds, something is wrong
            setTimeout(() => {
              const finalCheck = new URLSearchParams(window.location.search);
              if (!finalCheck.get('access_token')) {
                console.log("No tokens received, redirecting to reset request");
                navigate('/auth');
              }
            }, 3000);
          }
        };
        
        // Check for tokens after a short delay
        setTimeout(checkForTokens, 1000);
      }
    }
  }, [searchParams, navigate]);
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Welcome to BuilderSuite AI
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Currently, this is an invitation only platform built by<br />
            Old Creek Homes, LLC.
          </p>
        </div>
        
        <Card>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <CardHeader>
                <CardTitle>Sign In</CardTitle>
                <CardDescription>
                  Enter your credentials to access your account
                </CardDescription>
              </CardHeader>
              <CardContent>
                <LoginForm />
              </CardContent>
            </TabsContent>
            
            <TabsContent value="signup">
              <CardHeader>
                <CardTitle>Create Account</CardTitle>
                <CardDescription>
                  Fill out the form below to create your account
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SignupForm />
              </CardContent>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
