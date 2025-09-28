
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";


interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, session, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    console.log("🔑 ProtectedRoute: Still loading auth...");
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (!user || !session) {
    // Only redirect if we're sure auth is finished loading and no user/session exists
    if (!loading) {
      console.log("🔑 ProtectedRoute: No authenticated user, redirecting to auth");
      return <Navigate to="/auth" state={{ from: location }} replace />;
    }
    // Still loading, show loading spinner
    console.log("🔑 ProtectedRoute: Still determining auth state...");
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
