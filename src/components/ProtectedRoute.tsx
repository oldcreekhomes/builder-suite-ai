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
      <div 
        className="min-h-screen flex flex-col items-center justify-center bg-background"
        style={{ 
          minHeight: '100vh', 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif'
        }}
      >
        <div 
          className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"
          style={{
            width: '32px',
            height: '32px',
            border: '2px solid #e5e7eb',
            borderTopColor: '#2563eb',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}
        />
        <p 
          className="mt-4 text-muted-foreground"
          style={{ 
            marginTop: '16px', 
            color: '#6b7280',
            fontSize: '14px'
          }}
        >
          Checking authentication...
        </p>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!user || !session) {
    console.log("🔑 ProtectedRoute: No authenticated user, redirecting to auth");
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;
