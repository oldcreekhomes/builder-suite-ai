import { ReactNode, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAccountingPermissions } from "@/hooks/useAccountingPermissions";
import { useToast } from "@/hooks/use-toast";

interface TransactionsGuardProps {
  children: ReactNode;
}

export function TransactionsGuard({ children }: TransactionsGuardProps) {
  const { canAccessTransactions, isLoading } = useAccountingPermissions();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!isLoading && !canAccessTransactions) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access Transactions.",
        variant: "destructive",
      });
      navigate("/");
    }
  }, [canAccessTransactions, isLoading, navigate, toast]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!canAccessTransactions) {
    return null;
  }

  return <>{children}</>;
}
