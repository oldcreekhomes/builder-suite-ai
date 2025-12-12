import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Building2, Mail, Phone } from "lucide-react";

interface Representative {
  id: string;
  name: string;
  email: string;
  phone?: string;
  receiveScheduleNotifications: boolean;
}

interface CompanyResourcesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  companyName: string;
  representatives: Representative[];
  selectedRepIds: string[];
  onSave: (selectedRepIds: string[]) => void;
}

export function CompanyResourcesDialog({
  open,
  onOpenChange,
  companyId,
  companyName,
  representatives,
  selectedRepIds,
  onSave,
}: CompanyResourcesDialogProps) {
  const [localSelectedIds, setLocalSelectedIds] = useState<string[]>([]);

  // Initialize with selected reps or default to those with notifications enabled
  useEffect(() => {
    if (open) {
      if (selectedRepIds.length > 0) {
        // Use explicitly selected representatives
        setLocalSelectedIds(selectedRepIds);
      } else {
        // Default to representatives with notifications enabled
        const defaultSelected = representatives
          .filter(rep => rep.receiveScheduleNotifications)
          .map(rep => rep.id);
        setLocalSelectedIds(defaultSelected);
      }
    }
  }, [open, selectedRepIds, representatives]);

  const handleToggle = (repId: string) => {
    setLocalSelectedIds(prev =>
      prev.includes(repId)
        ? prev.filter(id => id !== repId)
        : [...prev, repId]
    );
  };

  const handleSave = () => {
    onSave(localSelectedIds);
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {companyName}
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm text-muted-foreground mb-4">
            Select representatives to notify for this task:
          </p>

          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {representatives.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">
                No representatives found for this company.
              </p>
            ) : (
              representatives.map(rep => {
                const isSelected = localSelectedIds.includes(rep.id);
                const isDefault = rep.receiveScheduleNotifications;

                return (
                  <div
                    key={rep.id}
                    className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 cursor-pointer transition-colors"
                    onClick={() => handleToggle(rep.id)}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleToggle(rep.id)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{rep.name}</span>
                        {isDefault && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            Default
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <Mail className="h-3 w-3" />
                        <span className="truncate">{rep.email}</span>
                      </div>
                      {rep.phone && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                          <Phone className="h-3 w-3" />
                          <span>{rep.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
