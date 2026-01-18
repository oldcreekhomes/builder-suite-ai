import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { ResolveConfirmationDialog } from "./resolve-confirmation-dialog";
import { useCompanyUsers } from "@/hooks/useCompanyUsers";

interface ResolveButtonProps {
  onResolve: (ccUserIds: string[]) => void | Promise<void>;
  title: string;
  description: string;
  size?: "default" | "sm" | "lg" | "icon";
  variant?: "ghost" | "outline" | "default";
  isLoading?: boolean;
  className?: string;
  showIcon?: boolean;
  disabled?: boolean;
  children?: React.ReactNode;
  authorId?: string;
}

export function ResolveButton({
  onResolve,
  title,
  description,
  size = "sm",
  variant = "ghost",
  isLoading = false,
  className = "",
  showIcon = true,
  disabled = false,
  children,
  authorId
}: ResolveButtonProps) {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const { users } = useCompanyUsers();

  const handleResolve = async (selectedUserIds: string[]) => {
    try {
      await onResolve(selectedUserIds);
      setShowConfirmation(false);
    } catch (error) {
      console.error('Resolve operation failed:', error);
      // The calling component should handle the error via toast
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => !disabled && setShowConfirmation(true)}
        disabled={isLoading || disabled}
        className={`text-green-600 hover:text-green-700 hover:bg-green-100 flex items-center gap-2 ${className}`}
      >
        {showIcon && <CheckCircle2 className="h-icon-sm w-icon-sm" />}
        {children}
      </Button>

      <ResolveConfirmationDialog
        open={showConfirmation}
        onOpenChange={setShowConfirmation}
        title={title}
        description={description}
        onConfirm={handleResolve}
        isLoading={isLoading}
        users={users}
        authorId={authorId}
      />
    </>
  );
}
