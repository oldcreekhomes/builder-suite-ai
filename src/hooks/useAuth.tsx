import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useImpersonation } from "@/contexts/ImpersonationContext";

const AUTH_TIMEOUT_MS = 8000; // 8 seconds max wait for auth

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  authInitError: string | null;
  isImpersonating: boolean;
  realUser: User | null;
  retryAuth: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [realUser, setRealUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authInitError, setAuthInitError] = useState<string | null>(null);
  
  // Get impersonation state from context - hook must be called unconditionally
  const impersonation = useImpersonation();
  const isImpersonating = impersonation.isImpersonating;
  const impersonatedProfile = impersonation.impersonatedProfile;
  
  // Return impersonated user if impersonating, otherwise return real user
  const user = isImpersonating && impersonatedProfile && realUser
    ? {
        ...realUser,
        id: impersonatedProfile.id,
        email: impersonatedProfile.email,
        user_metadata: {
          ...realUser.user_metadata,
          first_name: impersonatedProfile.first_name,
          last_name: impersonatedProfile.last_name,
          phone_number: impersonatedProfile.phone_number,
          company_name: impersonatedProfile.company_name,
        }
      }
    : realUser;
  
  console.log("🔑 AuthProvider rendering, loading:", loading, "user:", user?.email || "none");

  const initializeAuth = useCallback(async () => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout | null = null;
    
    console.log("🔑 AuthProvider initializing...");
    setLoading(true);
    setAuthInitError(null);

    // Set up timeout to prevent infinite loading
    timeoutId = setTimeout(() => {
      if (mounted && loading) {
        console.error("🔑 Auth initialization timed out after", AUTH_TIMEOUT_MS, "ms");
        setLoading(false);
        setAuthInitError("Authentication is taking longer than expected. Please try again.");
      }
    }, AUTH_TIMEOUT_MS);

    try {
      console.log("🔑 Getting initial session...");
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (!mounted) return;
      
      if (timeoutId) clearTimeout(timeoutId);
      
      if (error) {
        console.error("🔑 Error getting session:", error);
        setAuthInitError(error.message);
      } else {
        console.log("🔑 Initial session:", session?.user?.email || "no user");
        setSession(session);
        setRealUser(session?.user ?? null);
      }
      
      setLoading(false);
    } catch (error) {
      console.error("🔑 Error in getInitialSession:", error);
      if (mounted) {
        if (timeoutId) clearTimeout(timeoutId);
        setAuthInitError(error instanceof Error ? error.message : "Failed to initialize authentication");
        setLoading(false);
      }
    }

    return () => {
      mounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  const retryAuth = useCallback(() => {
    console.log("🔑 Retrying auth initialization...");
    initializeAuth();
  }, [initializeAuth]);

  useEffect(() => {
    let mounted = true;
    
    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;
        
        console.log("🔑 Auth state changed:", event, session?.user?.email || "no user");
        setSession(session);
        setRealUser(session?.user ?? null);
        setLoading(false);
        setAuthInitError(null);
      }
    );

    // Initialize auth
    initializeAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [initializeAuth]);

  const value = {
    user,
    session,
    loading,
    authInitError,
    isImpersonating,
    realUser,
    retryAuth,
  };

  // Show auth error UI if there's an error
  if (authInitError && !loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        fontFamily: 'system-ui, sans-serif',
        padding: '20px',
        backgroundColor: '#f9fafb'
      }}>
        <div style={{ 
          textAlign: 'center', 
          maxWidth: '400px',
          padding: '32px',
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{ 
            width: '48px', 
            height: '48px', 
            margin: '0 auto 16px',
            backgroundColor: '#fef2f2',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <span style={{ fontSize: '24px' }}>⚠️</span>
          </div>
          <h2 style={{ 
            fontSize: '18px', 
            fontWeight: '600', 
            color: '#111827',
            marginBottom: '8px'
          }}>
            Authentication Error
          </h2>
          <p style={{ 
            fontSize: '14px', 
            color: '#6b7280',
            marginBottom: '16px'
          }}>
            {authInitError}
          </p>
          <button 
            onClick={retryAuth}
            style={{
              padding: '8px 16px',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
