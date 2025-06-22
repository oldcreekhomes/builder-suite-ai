
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, session, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useUserProfile();

  // Show loading while checking authentication
  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to auth if not authenticated
  if (!user || !session) {
    return <Navigate to="/auth" replace />;
  }

  // Check if profile exists and user is approved
  if (profile) {
    // Home builders are automatically approved
    if (profile.user_type === 'home_builder') {
      return <>{children}</>;
    }
    
    // Employees need approval from their home builder
    if (profile.user_type === 'employee' && !profile.approved_by_home_builder) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle>Approval Pending</CardTitle>
              <CardDescription>
                Your account is waiting for approval from your home building company
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Your registration has been submitted and is pending approval from your home building company. 
                You will be able to access the dashboard once your account has been approved.
              </p>
              <p className="text-sm text-gray-500 mt-4">
                If you have questions, please contact your home building company directly.
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }
  }

  // If we get here, user is approved (or profile loading failed but user is authenticated)
  return <>{children}</>;
}
