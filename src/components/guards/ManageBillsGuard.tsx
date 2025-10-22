import { ReactNode, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAccountingPermissions } from "@/hooks/useAccountingPermissions";
import { useToast } from "@/hooks/use-toast";

interface ManageBillsGuardProps {
  children: ReactNode;
}

export function ManageBillsGuard({ children }: ManageBillsGuardProps) {
  const { canAccessManageBills, isLoading } = useAccountingPermissions();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!isLoading && !canAccessManageBills) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to manage bills.",
        variant: "destructive",
      });
      navigate("/");
    }
  }, [canAccessManageBills, isLoading, navigate, toast]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!canAccessManageBills) {
    return null;
  }

  return <>{children}</>;
}
