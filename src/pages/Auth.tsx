import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Logo from "@/components/Logo";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import LoginForm from "@/components/auth/LoginForm";
import SignupForm from "@/components/auth/SignupForm";

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [signupSuccessEmail, setSignupSuccessEmail] = useState<string | null>(null);

  useEffect(() => {
    const type = searchParams.get('type');
    console.log("Auth page loaded with params:", { type });
    if (type === 'recovery') {
      console.log("Recovery flow detected, redirecting to password reset page...");
      navigate(`/reset-password?${searchParams.toString()}`, { replace: true });
    }
  }, [searchParams, navigate]);

  if (signupSuccessEmail) {
    return (
      <div className="min-h-screen relative flex items-center justify-center p-4">
        <div className="absolute top-6 left-6">
          <Logo />
        </div>
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <CardTitle className="text-2xl">Check Your Email!</CardTitle>
            <CardDescription className="text-base">
              We've sent a verification link to <strong>{signupSuccessEmail}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Click the link in your email to verify your account and get started.
            </p>
            <Button variant="outline" className="w-full" onClick={() => setSignupSuccessEmail(null)}>
              Go to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative w-full flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="absolute top-6 left-6">
        <Logo />
      </div>
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Welcome to BuilderSuite ML
          </h2>
        </div>
        
        <Card className="w-full">
          <Tabs defaultValue={searchParams.get('tab') === 'signup' ? 'signup' : 'login'} className="w-full">
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
                <SignupForm onSuccess={setSignupSuccessEmail} />
              </CardContent>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
