
import React from 'react';

interface BiddingTableFooterProps {
  biddingItems: any[];
}

export function BiddingTableFooter({ biddingItems }: BiddingTableFooterProps) {
  if (biddingItems.length === 0) return null;

  const totalBidding = biddingItems.reduce(
    (sum, item) => sum + ((item.quantity || 0) * (item.unit_price || 0)), 
    0
  );

  const formatCurrency = (amount: number) => {
    return `$${Math.round(amount).toLocaleString()}`;
  };

  return (
    <div className="flex justify-end">
      <div className="text-lg font-semibold">
        Total Bidding: {formatCurrency(totalBidding)}
      </div>
    </div>
  );
}
