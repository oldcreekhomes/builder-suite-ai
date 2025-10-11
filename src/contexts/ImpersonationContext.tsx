import { createContext, useContext, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface User {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone_number: string | null;
  company_name: string | null;
  role: string;
  home_builder_id: string | null;
  confirmed: boolean;
}

interface ImpersonationContextType {
  isImpersonating: boolean;
  impersonatedUserId: string | null;
  impersonatedProfile: User | null;
  startImpersonation: (userId: string) => Promise<void>;
  stopImpersonation: () => void;
}

const ImpersonationContext = createContext<ImpersonationContextType | undefined>(undefined);

export const useImpersonation = () => {
  const context = useContext(ImpersonationContext);
  if (context === undefined) {
    throw new Error("useImpersonation must be used within an ImpersonationProvider");
  }
  return context;
};

interface ImpersonationProviderProps {
  children: ReactNode;
}

export const ImpersonationProvider = ({ children }: ImpersonationProviderProps) => {
  const [impersonatedUserId, setImpersonatedUserId] = useState<string | null>(null);
  const [impersonatedProfile, setImpersonatedProfile] = useState<User | null>(null);
  const { toast } = useToast();

  const startImpersonation = async (userId: string) => {
    try {
      // Fetch the user's profile
      const { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user profile for impersonation:', error);
        toast({
          title: "Error",
          description: "Failed to load user profile. Please try again.",
          variant: "destructive",
        });
        return;
      }

      if (!profile) {
        toast({
          title: "Error",
          description: "User profile not found.",
          variant: "destructive",
        });
        return;
      }

      setImpersonatedUserId(userId);
      setImpersonatedProfile(profile);

      toast({
        title: "Impersonation Started",
        description: `Now viewing as ${profile.first_name} ${profile.last_name || ''} (${profile.email})`,
      });
    } catch (error) {
      console.error('Error starting impersonation:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    }
  };

  const stopImpersonation = () => {
    setImpersonatedUserId(null);
    setImpersonatedProfile(null);

    toast({
      title: "Impersonation Ended",
      description: "Returned to your account",
    });
  };

  const value = {
    isImpersonating: !!impersonatedUserId,
    impersonatedUserId,
    impersonatedProfile,
    startImpersonation,
    stopImpersonation,
  };

  return (
    <ImpersonationContext.Provider value={value}>
      {children}
    </ImpersonationContext.Provider>
  );
};
