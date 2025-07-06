import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import type { Tables } from '@/integrations/supabase/types';

type CostCode = Tables<'cost_codes'>;
type CostCodeSpecification = Tables<'cost_code_specifications'>;

type SpecificationWithCostCode = CostCodeSpecification & {
  cost_code: CostCode;
};

interface EditSpecificationDescriptionDialogProps {
  specification: SpecificationWithCostCode | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateDescription: (specId: string, description: string) => Promise<void>;
}

export function EditSpecificationDescriptionDialog({
  specification,
  open,
  onOpenChange,
  onUpdateDescription
}: EditSpecificationDescriptionDialogProps) {
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  React.useEffect(() => {
    if (specification) {
      setDescription(specification.description || '');
    }
  }, [specification]);

  const handleSave = async () => {
    if (!specification) return;
    
    setIsLoading(true);
    try {
      await onUpdateDescription(specification.id, description);
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating description:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Description</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label>Cost Code</Label>
            <div className="text-sm text-gray-600">
              {specification?.cost_code.code} - {specification?.cost_code.name}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter specification description..."
              rows={4}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}