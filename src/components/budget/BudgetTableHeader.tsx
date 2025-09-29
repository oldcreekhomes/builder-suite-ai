
import React from 'react';
import { TableHead, TableHeader, TableRow } from '@/components/ui/table';

export function BudgetTableHeader() {
  return (
    <TableHeader>
      <TableRow className="h-8">
        <TableHead className="h-8 px-1 py-0 text-xs font-medium w-12"></TableHead>
        <TableHead className="h-8 px-1 py-0 text-xs font-medium">Cost Code</TableHead>
        <TableHead className="h-8 px-1 py-0 text-xs font-medium">Name</TableHead>
        <TableHead className="h-8 px-1 py-0 text-xs font-medium">Price</TableHead>
        <TableHead className="h-8 px-1 py-0 text-xs font-medium">Unit</TableHead>
        <TableHead className="h-8 px-1 py-0 text-xs font-medium">Quantity</TableHead>
        <TableHead className="h-8 px-1 py-0 text-xs font-medium">Total</TableHead>
        <TableHead className="h-8 px-1 py-0 text-xs font-medium">Historical</TableHead>
        <TableHead className="h-8 px-1 py-0 text-xs font-medium">Actions</TableHead>
      </TableRow>
    </TableHeader>
  );
}
