
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { DeleteConfirmationDialog } from "./delete-confirmation-dialog";

interface DeleteButtonProps {
  onDelete: () => void | Promise<void>;
  title: string;
  description: string;
  size?: "default" | "sm" | "lg" | "icon";
  variant?: "ghost" | "outline" | "destructive";
  isLoading?: boolean;
  className?: string;
  showIcon?: boolean;
  children?: React.ReactNode;
}

export function DeleteButton({
  onDelete,
  title,
  description,
  size = "sm",
  variant = "ghost",
  isLoading = false,
  className = "",
  showIcon = true,
  children
}: DeleteButtonProps) {
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleDelete = async () => {
    try {
      await onDelete();
      setShowConfirmation(false);
    } catch (error) {
      console.error('Delete operation failed:', error);
      // The calling component should handle the error via toast
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setShowConfirmation(true)}
        disabled={isLoading}
        className={`text-destructive hover:text-destructive/90 hover:bg-destructive/10 ${className}`}
      >
        {showIcon && <Trash2 className="h-icon-sm w-icon-sm" />}
        {children}
      </Button>

      <DeleteConfirmationDialog
        open={showConfirmation}
        onOpenChange={setShowConfirmation}
        title={title}
        description={description}
        onConfirm={handleDelete}
        isLoading={isLoading}
      />
    </>
  );
}
