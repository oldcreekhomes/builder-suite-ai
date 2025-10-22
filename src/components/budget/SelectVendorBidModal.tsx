import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useBudgetBidSelection } from "@/hooks/useBudgetBidSelection";
import { useState } from "react";
import { format } from "date-fns";
import type { Tables } from "@/integrations/supabase/types";

type CostCode = Tables<'cost_codes'>;
type BudgetItem = Tables<'project_budgets'>;

interface SelectVendorBidModalProps {
  isOpen: boolean;
  onClose: () => void;
  budgetItem: BudgetItem & { cost_codes: CostCode };
  costCode: CostCode;
  projectId: string;
  currentSelectedBidId?: string | null;
  onBidSelected: (bidId: string | null) => void;
}

export function SelectVendorBidModal({
  isOpen,
  onClose,
  budgetItem,
  costCode,
  projectId,
  currentSelectedBidId,
  onBidSelected,
}: SelectVendorBidModalProps) {
  const { availableBids, selectBid, isLoading } = useBudgetBidSelection(projectId, costCode.id);
  const [selectedBidId, setSelectedBidId] = useState<string | null>(currentSelectedBidId || null);

  const formatCurrency = (value: number | null | undefined) => {
    if (!value) return '$0';
    return `$${Math.round(value).toLocaleString()}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'won':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'lost':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleApply = () => {
    selectBid(
      { budgetItemId: budgetItem.id, bidId: selectedBidId },
      {
        onSuccess: () => {
          onBidSelected(selectedBidId);
          onClose();
        }
      }
    );
  };

  const handleClear = () => {
    selectBid(
      { budgetItemId: budgetItem.id, bidId: null },
      {
        onSuccess: () => {
          onBidSelected(null);
          onClose();
        }
      }
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            Select Vendor BID
          </DialogTitle>
          <div className="text-sm text-muted-foreground">
            {costCode.code} - {costCode.name}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-3 py-4">
          {availableBids.length === 0 ? (
            <div className="text-center py-8 space-y-2">
              <p className="text-sm text-muted-foreground">
                No bids available for this cost code yet.
              </p>
              <p className="text-xs text-muted-foreground">
                You can still enter manual pricing in the budget table.
              </p>
            </div>
          ) : (
            <RadioGroup value={selectedBidId || ''} onValueChange={setSelectedBidId}>
              <div className="space-y-2">
                {availableBids.map((bid) => (
                  <div
                    key={bid.id}
                    className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                      selectedBidId === bid.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => setSelectedBidId(bid.id)}
                  >
              <div className="flex items-start gap-3">
                      <RadioGroupItem value={bid.id} id={bid.id} className="mt-1" />
                      <Label htmlFor={bid.id} className="flex-1 cursor-pointer">
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1 flex-1">
                            <div className="font-medium text-sm">
                              {bid.companies?.company_name || 'Unknown Company'}
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge 
                                variant="outline" 
                                className={`text-xs ${getStatusColor(bid.packageStatus || 'pending')}`}
                              >
                                {bid.packageStatus || 'Pending'}
                              </Badge>
                              {bid.packageDueDate && (
                                <span className="text-xs text-muted-foreground">
                                  Due: {format(new Date(bid.packageDueDate), 'MMM d, yyyy')}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-base">
                              {formatCurrency(bid.price)}
                            </div>
                          </div>
                        </div>
                      </Label>
                    </div>
                  </div>
                ))}
              </div>
            </RadioGroup>
          )}
        </div>

        <DialogFooter className="gap-2">
          {currentSelectedBidId && (
            <Button
              variant="outline"
              onClick={handleClear}
              disabled={isLoading}
            >
              Clear Selection
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleApply} 
            disabled={!selectedBidId || isLoading || selectedBidId === currentSelectedBidId}
          >
            {isLoading ? 'Applying...' : 'Apply'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
