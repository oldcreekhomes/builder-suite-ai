import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function ConfirmInvitation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState<'loading' | 'form' | 'creating' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [invitationData, setInvitationData] = useState<any>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid invitation link - no token provided');
      return;
    }

    confirmInvitation();
  }, [token]);

  const confirmInvitation = async () => {
    try {
      const { data, error } = await supabase.rpc('confirm_invitation', {
        token: token
      });

      if (error) {
        console.error('Error confirming invitation:', error);
        setStatus('error');
        setMessage(error.message || 'Failed to confirm invitation');
        return;
      }

      console.log('Invitation confirmed:', data);
      setInvitationData(data);
      setStatus('form');
      setMessage('Please create your password to complete your account setup');

    } catch (error) {
      console.error('Error:', error);
      setStatus('error');
      setMessage('An unexpected error occurred');
    }
  };

  const createAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    
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
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    setStatus('creating');

    try {
      // First, try to sign up with minimal configuration to avoid email triggers
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: invitationData.email,
        password: password,
        options: {
          data: {
            user_type: 'employee',
            first_name: invitationData.first_name,
            last_name: invitationData.last_name,
            phone_number: invitationData.phone_number,
            role: invitationData.role,
            home_builder_id: invitationData.home_builder_id
          }
        }
      });

      // If we get an email confirmation error, it's not critical - just proceed
      if (authError && !authError.message?.includes('User already registered')) {
        console.log('SignUp error (may be expected):', authError);
        
        // If it's an email-related error, try to sign in directly 
        if (authError.message?.includes('confirmation') || authError.message?.includes('email')) {
          console.log('Email confirmation error detected, trying direct sign in...');
          
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: invitationData.email,
            password: password,
          });

          if (!signInError) {
            // Direct sign in worked, proceed to success
            setStatus('success');
            setMessage('Your account has been created successfully!');
            
            toast({
              title: "Welcome to BuilderSuite AI!",
              description: "Your account has been set up. Redirecting to dashboard...",
            });

            setTimeout(() => {
              navigate('/');
            }, 2000);
            return;
          }
        }
      }

      // Handle existing user case
      if (authError?.message?.includes('User already registered')) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: invitationData.email,
          password: password,
        });

        if (signInError) {
          setStatus('error');
          setMessage('Account exists but password is incorrect. Please try again or contact your administrator.');
          return;
        }

        // Successfully signed in existing user
        setStatus('success');
        setMessage('Welcome back! Redirecting to dashboard...');
        
        toast({
          title: "Welcome to BuilderSuite AI!",
          description: "Signed in successfully. Redirecting to dashboard...",
        });

        setTimeout(() => {
          navigate('/');
        }, 2000);
        return;
      }

      // If signup was successful (or we got here despite email errors)
      console.log('Account creation result:', authData);
      
      // Try to sign in to ensure the user is authenticated
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: invitationData.email,
        password: password,
      });

      if (signInError) {
        console.error('Error signing in after account creation:', signInError);
        // Don't fail completely - the account might still be created
        setStatus('success');
        setMessage('Account created! Please try logging in manually if you\'re not automatically signed in.');
        
        toast({
          title: "Account Created",
          description: "Please try logging in if you're not automatically signed in.",
        });

        setTimeout(() => {
          navigate('/auth');
        }, 3000);
        return;
      }

      setStatus('success');
      setMessage('Your account has been created successfully!');
      
      toast({
        title: "Welcome to BuilderSuite AI!",
        description: "Your account has been set up. Redirecting to dashboard...",
      });

      // Redirect to dashboard after a short delay
      setTimeout(() => {
        navigate('/');
      }, 2000);

    } catch (error) {
      console.error('Error:', error);
      setStatus('error');
      setMessage('An unexpected error occurred while creating your account');
    }
  };

  const getIcon = () => {
    switch (status) {
      case 'loading':
      case 'creating':
        return <Loader2 className="h-16 w-16 text-blue-500 animate-spin" />;
      case 'success':
        return <CheckCircle className="h-16 w-16 text-green-500" />;
      case 'error':
        return <XCircle className="h-16 w-16 text-red-500" />;
      case 'form':
        return <CheckCircle className="h-16 w-16 text-green-500" />;
    }
  };

  const getTitle = () => {
    switch (status) {
      case 'loading':
        return 'Confirming invitation...';
      case 'form':
        return `Welcome to BuilderSuite AI, ${invitationData?.first_name}!`;
      case 'creating':
        return 'Creating your account...';
      case 'success':
        return 'Welcome to BuilderSuite AI!';
      case 'error':
        return 'Invitation Error';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {getIcon()}
          </div>
          <CardTitle className="text-2xl">{getTitle()}</CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardContent>
          {status === 'form' && (
            <form onSubmit={createAccount} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={invitationData?.email || ''}
                  disabled
                  className="bg-gray-50"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Create Password *</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password *</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>

              <Button type="submit" className="w-full">
                Create Account
              </Button>
            </form>
          )}
          
          {status === 'success' && (
            <div className="space-y-4 text-center">
              <p className="text-sm text-gray-600">
                You will be redirected to the dashboard in a few seconds.
              </p>
              <Button onClick={() => navigate('/')} className="w-full">
                Go to Dashboard
              </Button>
            </div>
          )}
          
          {status === 'error' && (
            <div className="text-center">
              <Button onClick={() => navigate('/auth')} variant="outline" className="w-full">
                Go to Login
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
