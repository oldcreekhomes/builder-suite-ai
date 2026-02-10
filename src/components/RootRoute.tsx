import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Index from "@/pages/Index";
import Landing from "@/pages/Landing";
import MarketplacePortal from "@/pages/MarketplacePortal";

const RootRoute = () => {
  const { user, loading } = useAuth();
  const [userType, setUserType] = useState<string | null>(null);
  const [userTypeLoading, setUserTypeLoading] = useState(false);

  useEffect(() => {
    const fetchUserType = async () => {
      if (user) {
        setUserTypeLoading(true);
        try {
          // First check user metadata
          const metadataUserType = user.user_metadata?.user_type;
          if (metadataUserType) {
            setUserType(metadataUserType);
            setUserTypeLoading(false);
            return;
          }

          // Fallback: query the users table
          const { data, error } = await supabase
            .from('users')
            .select('user_type')
            .eq('id', user.id)
            .single();

          if (error) {
            console.error("Error fetching user type:", error);
            setUserType('home_builder'); // Default to home builder
          } else {
            setUserType(data?.user_type || 'home_builder');
          }
        } catch (err) {
          console.error("Error in fetchUserType:", err);
          setUserType('home_builder');
        } finally {
          setUserTypeLoading(false);
        }
      } else {
        setUserType(null);
      }
    };

    fetchUserType();
  }, [user]);

  // Show loading state with visible text (doesn't depend solely on Tailwind)
  if (loading || userTypeLoading) {
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
          Loading BuilderSuite ML...
        </p>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // If not authenticated, show landing page
  if (!user) {
    return <Landing />;
  }

  // Route based on user type
  if (userType === 'marketplace_vendor') {
    return <MarketplacePortal />;
  }

  // Default: Full BuilderSuite app for home builders
  return <Index />;
};

export default RootRoute;
