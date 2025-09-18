import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { CalendarIcon, Upload, X } from 'lucide-react';
import { GlobalBiddingSettingsWarningDialog } from './GlobalBiddingSettingsWarningDialog';
import { useToast } from '@/hooks/use-toast';

interface GlobalBiddingSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onApplySettings: (settings: GlobalBiddingSettings) => void;
  isLoading?: boolean;
  progress?: number;
}

export interface GlobalBiddingSettings {
  dueDate: Date | null;
  reminderDate: Date | null;
  files: File[];
}

export function GlobalBiddingSettingsModal({
  open,
  onOpenChange,
  projectId,
  onApplySettings,
  isLoading = false,
  progress = 0
}: GlobalBiddingSettingsModalProps) {
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [reminderDate, setReminderDate] = useState<Date | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [showWarningDialog, setShowWarningDialog] = useState(false);
  const { toast } = useToast();

  const handleDueDateChange = (newDate: Date | undefined) => {
    if (!newDate) {
      setDueDate(null);
      return;
    }

    // Check if date is today or in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(newDate);
    selectedDate.setHours(0, 0, 0, 0);

    if (selectedDate <= today) {
      toast({
        title: "Invalid Due Date",
        description: "Due date must be in the future.",
        variant: "destructive",
      });
      return;
    }

    setDueDate(newDate);
    
    // If reminder date is after new due date, clear it
    if (reminderDate && reminderDate >= newDate) {
      setReminderDate(null);
      toast({
        title: "Reminder Date Cleared",
        description: "Reminder date must be before the due date.",
        variant: "default",
      });
    }
  };

  const handleReminderDateChange = (newDate: Date | undefined) => {
    if (!newDate) {
      setReminderDate(null);
      return;
    }

    // Check if date is today or in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(newDate);
    selectedDate.setHours(0, 0, 0, 0);

    if (selectedDate <= today) {
      toast({
        title: "Invalid Reminder Date",
        description: "Reminder date must be in the future.",
        variant: "destructive",
      });
      return;
    }

    // Validation for reminder date
    if (dueDate && newDate >= dueDate) {
      toast({
        title: "Invalid Reminder Date",
        description: "Reminder date must be before the due date.",
        variant: "destructive",
      });
      return;
    }

    setReminderDate(newDate);
  };

  const handleFileUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = '.pdf,.doc,.docx,.xls,.xlsx';
    input.onchange = (e) => {
      const selectedFiles = Array.from((e.target as HTMLInputElement).files || []);
      if (selectedFiles.length > 0) {
        setFiles(prev => [...prev, ...selectedFiles]);
      }
    };
    input.click();
  };

  const handleRemoveFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleApply = () => {
    // Check if any settings are provided
    if (!dueDate && !reminderDate && files.length === 0) {
      toast({
        title: "No Settings Selected",
        description: "Please select at least one setting to apply globally.",
        variant: "destructive",
      });
      return;
    }

    setShowWarningDialog(true);
  };

  const handleConfirmApply = () => {
    const settings: GlobalBiddingSettings = {
      dueDate,
      reminderDate,
      files
    };
    
    onApplySettings(settings);
    setShowWarningDialog(false);
    handleCancel();
  };

  const handleCancel = () => {
    setDueDate(null);
    setReminderDate(null);
    setFiles([]);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Global Bidding Settings</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Due Date */}
            <div>
              <label className="text-sm font-medium mb-2 block">Due Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dueDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, "MM/dd/yyyy") : "Select due date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dueDate || undefined}
                    onSelect={handleDueDateChange}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Reminder Date */}
            <div>
              <label className="text-sm font-medium mb-2 block">Reminder Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !reminderDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {reminderDate ? format(reminderDate, "MM/dd/yyyy") : "Select reminder date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={reminderDate || undefined}
                    onSelect={handleReminderDateChange}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Files */}
            <div>
              <label className="text-sm font-medium mb-2 block">Files</label>
              <Button
                variant="outline"
                onClick={handleFileUpload}
                className="w-full justify-start"
              >
                <Upload className="mr-2 h-4 w-4" />
                Upload Files
              </Button>
              
              {files.length > 0 && (
                <div className="mt-2 space-y-1 max-h-32 overflow-auto">
                  {files.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-muted rounded text-sm">
                      <span className="truncate flex-1" title={file.name}>
                        file {index + 1}.{file.name.split('.').pop() || 'pdf'}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveFile(index)}
                        className="h-6 w-6 p-0 ml-2"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Progress Bar when applying settings */}
          {isLoading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Applying global settings...</span>
                <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
              Cancel
            </Button>
            <Button 
              onClick={handleApply} 
              disabled={isLoading} 
              style={{ backgroundColor: '#000000', color: '#ffffff' }}
              className="hover:opacity-90"
            >
              Apply Global Settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <GlobalBiddingSettingsWarningDialog
        open={showWarningDialog}
        onOpenChange={setShowWarningDialog}
        onConfirm={handleConfirmApply}
        isLoading={isLoading}
      />
    </>
  );
}