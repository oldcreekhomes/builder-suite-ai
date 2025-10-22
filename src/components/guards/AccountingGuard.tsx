import { ReactNode, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAccountingPermissions } from "@/hooks/useAccountingPermissions";
import { useToast } from "@/hooks/use-toast";

interface AccountingGuardProps {
  children: ReactNode;
}

export function AccountingGuard({ children }: AccountingGuardProps) {
  const { canAccessAccounting, isLoading } = useAccountingPermissions();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!isLoading && !canAccessAccounting) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access Accounting.",
        variant: "destructive",
      });
      navigate("/");
    }
  }, [canAccessAccounting, isLoading, navigate, toast]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!canAccessAccounting) {
    return null;
  }

  return <>{children}</>;
}
