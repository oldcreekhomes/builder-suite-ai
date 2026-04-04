import { ReactNode, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useApartmentPermissions } from "@/hooks/useApartmentPermissions";
import { useToast } from "@/hooks/use-toast";

interface ApartmentGuardProps {
  children: ReactNode;
}

export function ApartmentGuard({ children }: ApartmentGuardProps) {
  const { canAccessApartments, isLoading } = useApartmentPermissions();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!isLoading && !canAccessApartments) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access Apartments.",
        variant: "destructive",
      });
      navigate("/");
    }
  }, [canAccessApartments, isLoading, navigate, toast]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!canAccessApartments) {
    return null;
  }

  return <>{children}</>;
}
