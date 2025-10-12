import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAppLoading } from "@/contexts/AppLoadingContext";
import { useEffect } from "react";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, session, loading } = useAuth();
  const { setIsLoading, setLoadingPhase } = useAppLoading();
  const location = useLocation();

  useEffect(() => {
    if (loading) {
      setLoadingPhase('Checking authentication...');
      setIsLoading(true);
    } else {
      // Auth completed - let page components take over loading state
      setIsLoading(false);
    }
  }, [loading, setIsLoading, setLoadingPhase]);

  if (loading) {
    console.log("🔑 ProtectedRoute: Still loading auth...");
    return null; // Global loading screen will show
  }

  if (!user || !session) {
    console.log("🔑 ProtectedRoute: No authenticated user, redirecting to auth");
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Auth is complete, but project might still be loading
  return children;
};

export default ProtectedRoute;
