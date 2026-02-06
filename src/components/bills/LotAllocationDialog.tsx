import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ProjectLot } from "@/hooks/useLots";

export interface LotAllocation {
  lotId: string;
  lotName: string;
  amount: number;
  selected: boolean;
}

interface LotAllocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lots: ProjectLot[];
  totalAmount: number;
  billCount: number;
  onConfirm: (allocations: LotAllocation[]) => Promise<void>;
  onCancel: () => void;
}

export function LotAllocationDialog({
  open,
  onOpenChange,
  lots,
  totalAmount,
  billCount,
  onConfirm,
  onCancel,
}: LotAllocationDialogProps) {
  const [allocations, setAllocations] = useState<LotAllocation[]>([]);
  const [divideEvenly, setDivideEvenly] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize allocations when dialog opens or lots change
  useEffect(() => {
    if (open && lots.length > 0) {
      const evenAmount = totalAmount / lots.length;
      const initialAllocations = lots.map((lot, index) => {
        // Handle rounding: last lot gets the remainder
        const isLast = index === lots.length - 1;
        const baseAmount = Math.floor(evenAmount * 100) / 100;
        const remainder = totalAmount - (baseAmount * (lots.length - 1));
        
        return {
          lotId: lot.id,
          lotName: lot.lot_name || `Lot ${lot.lot_number}`,
          amount: isLast ? Math.round(remainder * 100) / 100 : baseAmount,
          selected: true,
        };
      });
      setAllocations(initialAllocations);
      setDivideEvenly(true);
    }
  }, [open, lots, totalAmount]);

  // Recalculate even split when toggle changes or selections change
  useEffect(() => {
    if (divideEvenly && allocations.length > 0) {
      const selectedCount = allocations.filter(a => a.selected).length;
      if (selectedCount === 0) return;

      const evenAmount = totalAmount / selectedCount;
      let runningTotal = 0;
      
      setAllocations(prev => prev.map((alloc, index) => {
        if (!alloc.selected) {
          return { ...alloc, amount: 0 };
        }
        
        // Count remaining selected items after this one
        const remainingSelected = prev.slice(index + 1).filter(a => a.selected).length;
        const isLastSelected = remainingSelected === 0;
        
        if (isLastSelected) {
          // Last selected gets remainder to avoid rounding issues
          const remainder = totalAmount - runningTotal;
          return { ...alloc, amount: Math.round(remainder * 100) / 100 };
        }
        
        const baseAmount = Math.floor(evenAmount * 100) / 100;
        runningTotal += baseAmount;
        return { ...alloc, amount: baseAmount };
      }));
    }
  }, [divideEvenly, totalAmount]);

  // Calculate totals
  const { allocatedTotal, allocationDifference, selectedCount } = useMemo(() => {
    const selected = allocations.filter(a => a.selected);
    const total = selected.reduce((sum, a) => sum + a.amount, 0);
    return {
      allocatedTotal: Math.round(total * 100) / 100,
      allocationDifference: Math.round((totalAmount - total) * 100) / 100,
      selectedCount: selected.length,
    };
  }, [allocations, totalAmount]);

  const isValid = selectedCount > 0 && Math.abs(allocationDifference) < 0.01;

  const handleSelectionChange = (lotId: string, checked: boolean) => {
    setAllocations(prev => {
      const updated = prev.map(a => 
        a.lotId === lotId ? { ...a, selected: checked, amount: checked ? a.amount : 0 } : a
      );
      
      // If divide evenly is on, recalculate
      if (divideEvenly) {
        const selectedCount = updated.filter(a => a.selected).length;
        if (selectedCount === 0) return updated;
        
        const evenAmount = totalAmount / selectedCount;
        let runningTotal = 0;
        
        return updated.map((alloc, index) => {
          if (!alloc.selected) {
            return { ...alloc, amount: 0 };
          }
          
          const remainingSelected = updated.slice(index + 1).filter(a => a.selected).length;
          const isLastSelected = remainingSelected === 0;
          
          if (isLastSelected) {
            const remainder = totalAmount - runningTotal;
            return { ...alloc, amount: Math.round(remainder * 100) / 100 };
          }
          
          const baseAmount = Math.floor(evenAmount * 100) / 100;
          runningTotal += baseAmount;
          return { ...alloc, amount: baseAmount };
        });
      }
      
      return updated;
    });
  };

  const handleAmountChange = (lotId: string, value: string) => {
    // Turn off even split when user manually edits
    setDivideEvenly(false);
    
    const numValue = parseFloat(value) || 0;
    setAllocations(prev => prev.map(a => 
      a.lotId === lotId ? { ...a, amount: Math.round(numValue * 100) / 100 } : a
    ));
  };

  const handleDivideEvenlyChange = (checked: boolean) => {
    setDivideEvenly(checked);
    
    if (checked) {
      const selectedCount = allocations.filter(a => a.selected).length;
      if (selectedCount === 0) return;
      
      const evenAmount = totalAmount / selectedCount;
      let runningTotal = 0;
      
      setAllocations(prev => prev.map((alloc, index) => {
        if (!alloc.selected) {
          return { ...alloc, amount: 0 };
        }
        
        const remainingSelected = prev.slice(index + 1).filter(a => a.selected).length;
        const isLastSelected = remainingSelected === 0;
        
        if (isLastSelected) {
          const remainder = totalAmount - runningTotal;
          return { ...alloc, amount: Math.round(remainder * 100) / 100 };
        }
        
        const baseAmount = Math.floor(evenAmount * 100) / 100;
        runningTotal += baseAmount;
        return { ...alloc, amount: baseAmount };
      }));
    }
  };

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm(allocations);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getPercentage = (amount: number) => {
    if (totalAmount === 0) return "0.00%";
    return ((amount / totalAmount) * 100).toFixed(2) + "%";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Allocate Bill{billCount > 1 ? 's' : ''} to Addresses</DialogTitle>
          <DialogDescription>
            This project has multiple addresses. Allocate the total amount of{" "}
            <span className="font-semibold text-foreground">{formatCurrency(totalAmount)}</span>{" "}
            across the selected addresses.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="divide-evenly"
              checked={divideEvenly}
              onCheckedChange={handleDivideEvenlyChange}
            />
            <Label htmlFor="divide-evenly">Divide evenly across selected addresses</Label>
          </div>

          <Table containerClassName="relative w-full">
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Select</TableHead>
                <TableHead>Address</TableHead>
                <TableHead className="w-32 text-right">Amount</TableHead>
                <TableHead className="w-24 text-right">Percentage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allocations.map((alloc) => (
                <TableRow key={alloc.lotId}>
                  <TableCell>
                    <Checkbox
                      checked={alloc.selected}
                      onCheckedChange={(checked) => 
                        handleSelectionChange(alloc.lotId, checked === true)
                      }
                    />
                  </TableCell>
                  <TableCell className="font-medium">{alloc.lotName}</TableCell>
                  <TableCell className="text-right">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={alloc.amount}
                      onChange={(e) => handleAmountChange(alloc.lotId, e.target.value)}
                      disabled={!alloc.selected}
                      className="w-28 text-right ml-auto"
                    />
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {alloc.selected ? getPercentage(alloc.amount) : "—"}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/50 font-semibold">
                <TableCell colSpan={2}>Total</TableCell>
                <TableCell className="text-right">
                  <span className={Math.abs(allocationDifference) >= 0.01 ? "text-destructive" : ""}>
                    {formatCurrency(allocatedTotal)}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  {selectedCount > 0 ? "100%" : "—"}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>

          {Math.abs(allocationDifference) >= 0.01 && (
            <p className="text-sm text-destructive">
              Allocation is off by {formatCurrency(Math.abs(allocationDifference))}. 
              Please adjust amounts to match the total of {formatCurrency(totalAmount)}.
            </p>
          )}

          {selectedCount === 0 && (
            <p className="text-sm text-destructive">
              Please select at least one address.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!isValid || isSubmitting}>
            {isSubmitting ? "Applying..." : "Apply Allocation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
