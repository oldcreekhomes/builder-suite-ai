import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DeleteConfirmationDialog } from "./delete-confirmation-dialog";

export interface TableAction {
  label: string;
  onClick: (...args: any[]) => void;
  variant?: 'default' | 'destructive';
  requiresConfirmation?: boolean;
  confirmTitle?: string;
  confirmDescription?: string;
  disabled?: boolean;
  isLoading?: boolean;
  hidden?: boolean;
}

interface TableRowActionsProps {
  actions: TableAction[];
}

export function TableRowActions({ actions }: TableRowActionsProps) {
  const [confirmAction, setConfirmAction] = useState<TableAction | null>(null);

  const visibleActions = actions.filter(a => !a.hidden);
  const defaultActions = visibleActions.filter(a => a.variant !== 'destructive');
  const destructiveActions = visibleActions.filter(a => a.variant === 'destructive');

  const handleClick = (action: TableAction) => {
    if (action.requiresConfirmation) {
      setConfirmAction(action);
    } else {
      action.onClick();
    }
  };

  const handleConfirm = async () => {
    if (confirmAction) {
      try {
        await confirmAction.onClick();
      } catch (error) {
        console.error('Action failed:', error);
      }
      setConfirmAction(null);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0 mx-auto">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-popover">
          {defaultActions.map((action) => (
            <DropdownMenuItem
              key={action.label}
              onClick={() => handleClick(action)}
              disabled={action.disabled || action.isLoading}
            >
              {action.label}
            </DropdownMenuItem>
          ))}
          {defaultActions.length > 0 && destructiveActions.length > 0 && (
            <DropdownMenuSeparator />
          )}
          {destructiveActions.map((action) => (
            <DropdownMenuItem
              key={action.label}
              onClick={() => handleClick(action)}
              disabled={action.disabled || action.isLoading}
              className="text-destructive focus:text-destructive"
            >
              {action.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <DeleteConfirmationDialog
        open={!!confirmAction}
        onOpenChange={(open) => !open && setConfirmAction(null)}
        title={confirmAction?.confirmTitle || "Are you sure?"}
        description={confirmAction?.confirmDescription || "This action cannot be undone."}
        onConfirm={handleConfirm}
        isLoading={confirmAction?.isLoading || false}
      />
    </>
  );
}
