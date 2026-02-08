import { ReactNode, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMarketplacePermissions } from "@/hooks/useMarketplacePermissions";
import { useToast } from "@/hooks/use-toast";

interface MarketplaceGuardProps {
  children: ReactNode;
}

export function MarketplaceGuard({ children }: MarketplaceGuardProps) {
  const { canAccessMarketplace, isLoading } = useMarketplacePermissions();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!isLoading && !canAccessMarketplace) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access the Marketplace.",
        variant: "destructive",
      });
      navigate("/");
    }
  }, [canAccessMarketplace, isLoading, navigate, toast]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!canAccessMarketplace) {
    return null;
  }

  return <>{children}</>;
}
