import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Edit3 } from 'lucide-react';

interface NotesEditorProps {
  value: string;
  onChange: (value: string) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function NotesEditor({ value, onChange, open: externalOpen, onOpenChange: externalOnOpenChange }: NotesEditorProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = externalOpen ?? internalOpen;
  const setIsOpen = externalOnOpenChange ?? setInternalOpen;
  const [tempValue, setTempValue] = useState(value);

  const handleSave = () => {
    onChange(tempValue);
    setIsOpen(false);
  };

  const handleCancel = () => {
    setTempValue(value);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Notes</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Textarea
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            placeholder="Enter notes..."
            rows={4}
          />
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}