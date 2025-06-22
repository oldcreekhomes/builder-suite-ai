
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function ConfirmInvitation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

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

      setStatus('success');
      setMessage('Your account has been created successfully!');
      
      toast({
        title: "Welcome!",
        description: "Your account has been set up. You can now log in.",
      });

      // Redirect to login after a short delay
      setTimeout(() => {
        navigate('/auth');
      }, 3000);

    } catch (error) {
      console.error('Error:', error);
      setStatus('error');
      setMessage('An unexpected error occurred');
    }
  };

  const getIcon = () => {
    switch (status) {
      case 'loading':
        return <Loader2 className="h-16 w-16 text-blue-500 animate-spin" />;
      case 'success':
        return <CheckCircle className="h-16 w-16 text-green-500" />;
      case 'error':
        return <XCircle className="h-16 w-16 text-red-500" />;
    }
  };

  const getTitle = () => {
    switch (status) {
      case 'loading':
        return 'Setting up your account...';
      case 'success':
        return 'Welcome to BuildCore!';
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
        <CardContent className="text-center">
          {status === 'success' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                You will be redirected to the login page in a few seconds.
              </p>
              <Button onClick={() => navigate('/auth')} className="w-full">
                Go to Login
              </Button>
            </div>
          )}
          {status === 'error' && (
            <Button onClick={() => navigate('/auth')} variant="outline" className="w-full">
              Go to Login
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
