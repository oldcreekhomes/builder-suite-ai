import { ReactNode, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAccountingPermissions } from "@/hooks/useAccountingPermissions";
import { useToast } from "@/hooks/use-toast";

interface ReportsGuardProps {
  children: ReactNode;
}

export function ReportsGuard({ children }: ReportsGuardProps) {
  const { canAccessReports, isLoading } = useAccountingPermissions();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!isLoading && !canAccessReports) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access Reports.",
        variant: "destructive",
      });
      navigate("/");
    }
  }, [canAccessReports, isLoading, navigate, toast]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!canAccessReports) {
    return null;
  }

  return <>{children}</>;
}
