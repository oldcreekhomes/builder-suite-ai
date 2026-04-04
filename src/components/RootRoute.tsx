import { useAuth } from "@/hooks/useAuth";
import React, { Suspense, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

console.log("[BOOT] RootRoute module loaded");

// Lazy-load destination pages so RootRoute itself stays lightweight
const Index = React.lazy(() => import("@/pages/Index"));
const Landing = React.lazy(() => import("@/pages/Landing"));
const MarketplacePortal = React.lazy(() => import("@/pages/MarketplacePortal"));

const LoadingFallback = () => (
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

const RootRoute = () => {
  const { user, loading } = useAuth();
  const [userType, setUserType] = useState<string | null>(null);
  const [userTypeLoading, setUserTypeLoading] = useState(false);

  useEffect(() => {
    const fetchUserType = async () => {
      if (user) {
        setUserTypeLoading(true);
        try {
          const metadataUserType = user.user_metadata?.user_type;
          if (metadataUserType) {
            setUserType(metadataUserType);
            setUserTypeLoading(false);
            return;
          }

          const { data, error } = await supabase
            .from('users')
            .select('user_type')
            .eq('id', user.id)
            .single();

          if (error) {
            console.error("Error fetching user type:", error);
            setUserType('home_builder');
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

  if (loading || userTypeLoading) {
    return <LoadingFallback />;
  }

  if (!user) {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <Landing />
      </Suspense>
    );
  }

  if (userType === 'marketplace_vendor') {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <MarketplacePortal />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<LoadingFallback />}>
      <Index />
    </Suspense>
  );
};

export default RootRoute;
