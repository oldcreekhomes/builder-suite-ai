import { ReactNode, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTemplatePermissions } from "@/hooks/useTemplatePermissions";
import { useToast } from "@/hooks/use-toast";

interface TemplatesGuardProps {
  children: ReactNode;
}

export function TemplatesGuard({ children }: TemplatesGuardProps) {
  const { canAccessTemplates, isLoading } = useTemplatePermissions();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!isLoading && !canAccessTemplates) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access Templates.",
        variant: "destructive",
      });
      navigate("/");
    }
  }, [canAccessTemplates, isLoading, navigate, toast]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!canAccessTemplates) {
    return null;
  }

  return <>{children}</>;
}
