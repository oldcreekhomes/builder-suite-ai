
import React from 'react';

interface BiddingTableFooterProps {
  biddingItems: any[];
}

export function BiddingTableFooter({ biddingItems }: BiddingTableFooterProps) {
  if (biddingItems.length === 0) return null;

  return (
    <div className="flex justify-end">
      <div className="text-lg font-semibold">
        Total Items: {biddingItems.length}
      </div>
    </div>
  );
}
