import { useState } from 'react';
import { useAllBiddingData } from '@/hooks/useBiddingData';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface FromBidsTabProps {
  projectId: string;
  selectedBids: Map<string, string>; // costCodeId -> bidId
  onBidsChange: (bids: Map<string, string>) => void;
}

export function FromBidsTab({ projectId, selectedBids, onBidsChange }: FromBidsTabProps) {
  const { data: biddingPackages = [] } = useAllBiddingData(projectId);

  const handleBidSelect = (costCodeId: string, bidId: string | null) => {
    const newBids = new Map(selectedBids);
    if (bidId === null) {
      newBids.delete(costCodeId);
    } else {
      newBids.set(costCodeId, bidId);
    }
    onBidsChange(newBids);
  };

  const formatCurrency = (value: number) => {
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

  const packagesWithBids = biddingPackages.filter(pkg => 
    pkg.project_bids && pkg.project_bids.length > 0
  );

  if (packagesWithBids.length === 0) {
    return (
      <div className="text-center py-8 space-y-2">
        <p className="text-sm text-muted-foreground">
          No bidding packages with received bids found.
        </p>
        <p className="text-xs text-muted-foreground">
          Create bidding packages and receive bids before using this method.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-h-[400px] overflow-auto">
      {packagesWithBids.map((pkg) => {
        const costCodeId = pkg.cost_code_id;
        const selectedBidId = selectedBids.get(costCodeId);
        
        return (
          <div key={pkg.id} className="border rounded-lg p-4 space-y-3">
            <div className="font-medium text-sm border-b pb-2">
              {pkg.cost_codes?.code}: {pkg.cost_codes?.name}
              <Badge 
                variant="outline" 
                className={`ml-2 text-xs ${getStatusColor(pkg.status || 'pending')}`}
              >
                {pkg.status || 'Pending'}
              </Badge>
            </div>

            <RadioGroup 
              value={selectedBidId || ''} 
              onValueChange={(value) => handleBidSelect(costCodeId, value || null)}
            >
              <div className="space-y-2">
                {pkg.project_bids?.map((bid: any) => (
                  <div
                    key={bid.id}
                    className={`border rounded p-2 cursor-pointer transition-colors ${
                      selectedBidId === bid.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => handleBidSelect(costCodeId, bid.id)}
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value={bid.id} id={bid.id} />
                      <Label htmlFor={bid.id} className="flex-1 cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="font-medium text-sm">
                              {bid.companies?.company_name || 'Unknown Company'}
                            </div>
                            {pkg.due_date && (
                              <div className="text-xs text-muted-foreground">
                                Due: {format(new Date(pkg.due_date), 'MMM d, yyyy')}
                              </div>
                            )}
                          </div>
                          <div className="font-semibold text-base">
                            {formatCurrency(bid.price || 0)}
                          </div>
                        </div>
                      </Label>
                    </div>
                  </div>
                ))}
              </div>
            </RadioGroup>
          </div>
        );
      })}

      {selectedBids.size > 0 && (
        <div className="flex items-center justify-between pt-4 border-t sticky bottom-0 bg-background">
          <div className="text-sm text-muted-foreground">
            {selectedBids.size} bids selected
          </div>
          <div className="text-right">
            <div className="text-sm text-muted-foreground">Total Budget</div>
            <div className="text-lg font-semibold">
              {formatCurrency(
                Array.from(selectedBids.entries()).reduce((sum, [costCodeId, bidId]) => {
                  const pkg = packagesWithBids.find(p => p.cost_code_id === costCodeId);
                  const bid = pkg?.project_bids?.find((b: any) => b.id === bidId);
                  return sum + (bid?.price || 0);
                }, 0)
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
