import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";

interface User {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
}

interface ResolveConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onConfirm: (selectedUserIds: string[]) => void;
  isLoading?: boolean;
  users?: User[];
  authorId?: string;
}

export function ResolveConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  isLoading = false,
  users = [],
  authorId
}: ResolveConfirmationDialogProps) {
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  // Filter out the author from the CC list and sort alphabetically by first name
  const availableUsers = users
    .filter(user => user.id !== authorId)
    .sort((a, b) => {
      const nameA = (a.first_name || a.email).toLowerCase();
      const nameB = (b.first_name || b.email).toLowerCase();
      return nameA.localeCompare(nameB);
    });

  const handleUserToggle = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedUserIds(prev => [...prev, userId]);
    } else {
      setSelectedUserIds(prev => prev.filter(id => id !== userId));
    }
  };

  const handleConfirm = () => {
    onConfirm(selectedUserIds);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset selections when closing
      setSelectedUserIds([]);
    }
    onOpenChange(newOpen);
  };

  const getUserDisplayName = (user: User) => {
    const name = [user.first_name, user.last_name].filter(Boolean).join(' ');
    return name || user.email;
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {availableUsers.length > 0 && (
          <div className="space-y-3 py-2">
            <Label className="text-sm font-medium">
              Notify additional users (optional):
            </Label>
            <ScrollArea className="h-[150px] rounded-md border p-3">
              <div className="space-y-3">
                {availableUsers.map((user) => (
                  <div key={user.id} className="flex items-start space-x-3">
                    <Checkbox
                      id={`user-${user.id}`}
                      checked={selectedUserIds.includes(user.id)}
                      onCheckedChange={(checked) => 
                        handleUserToggle(user.id, checked as boolean)
                      }
                      disabled={isLoading}
                    />
                    <label
                      htmlFor={`user-${user.id}`}
                      className="text-sm leading-tight cursor-pointer font-medium"
                    >
                      {getUserDisplayName(user)}
                    </label>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading}
            className="bg-green-600 hover:bg-green-700 focus:ring-green-600"
          >
            {isLoading ? "Resolving..." : "Resolve"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
