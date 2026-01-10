import { useAuth } from "@/hooks/useAuth";
import Index from "@/pages/Index";
import Landing from "@/pages/Landing";

const RootRoute = () => {
  const { user, loading } = useAuth();

  // Show nothing while loading to prevent flash
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show Landing for unauthenticated users, Index for authenticated
  return user ? <Index /> : <Landing />;
};

export default RootRoute;
