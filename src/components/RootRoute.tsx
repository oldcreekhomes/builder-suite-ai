import { useAuth } from "@/hooks/useAuth";
import Index from "@/pages/Index";
import Landing from "@/pages/Landing";

const RootRoute = () => {
  const { user, loading } = useAuth();

  // Show loading state with visible text (doesn't depend solely on Tailwind)
  if (loading) {
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
          Loading BuilderSuite AI...
        </p>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Show Landing for unauthenticated users, Index for authenticated
  return user ? <Index /> : <Landing />;
};

export default RootRoute;
