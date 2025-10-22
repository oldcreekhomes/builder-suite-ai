
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useImpersonation } from "@/contexts/ImpersonationContext";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isImpersonating: boolean;
  realUser: User | null;
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
  
  // Get impersonation state from context
  const { isImpersonating, impersonatedProfile } = useImpersonation();
  
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

  useEffect(() => {
    let mounted = true;
    
    console.log("🔑 AuthProvider initializing...");

    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;
        
        console.log("🔑 Auth state changed:", event, session?.user?.email || "no user");
        setSession(session);
        setRealUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Get initial session
    const getInitialSession = async () => {
      try {
        console.log("🔑 Getting initial session...");
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("🔑 Error getting session:", error);
        }
        
        if (mounted) {
          console.log("🔑 Initial session:", session?.user?.email || "no user");
          setSession(session);
          setRealUser(session?.user ?? null);
          setLoading(false);
        }
      } catch (error) {
        console.error("🔑 Error in getInitialSession:", error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    getInitialSession();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = {
    user,
    session,
    loading,
    isImpersonating,
    realUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
