
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
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: invitationData.email,
        password: password,
        options: {
          emailRedirectTo: undefined, // Disable email confirmation
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

      if (authError) {
        console.error('Error creating account:', authError);
        setStatus('error');
        setMessage(authError.message || 'Failed to create account');
        return;
      }

      console.log('Account created successfully:', authData);
      
      // If the user is immediately confirmed (no email verification needed)
      if (authData.user && !authData.user.email_confirmed_at) {
        // For invited employees, we'll manually confirm them by signing in
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: invitationData.email,
          password: password,
        });

        if (signInError) {
          console.error('Error signing in after account creation:', signInError);
          setStatus('error');
          setMessage('Account created but failed to sign in. Please try logging in.');
          return;
        }
      }

      setStatus('success');
      setMessage('Your account has been created successfully!');
      
      toast({
        title: "Welcome!",
        description: "Your account has been set up. Redirecting to dashboard...",
      });

      // Redirect to dashboard immediately
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
