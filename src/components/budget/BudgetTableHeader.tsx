
import React from 'react';
import { TableHead, TableHeader, TableRow } from '@/components/ui/table';

export function BudgetTableHeader() {
  return (
    <TableHeader>
      <TableRow className="h-10">
        <TableHead className="font-bold w-12 py-2 text-sm"></TableHead>
        <TableHead className="font-bold py-2 text-sm">Cost Code</TableHead>
        <TableHead className="font-bold py-2 text-sm">Name</TableHead>
        <TableHead className="font-bold py-2 text-sm">Price</TableHead>
        <TableHead className="font-bold py-2 text-sm">Unit</TableHead>
        <TableHead className="font-bold py-2 text-sm">Quantity</TableHead>
        <TableHead className="font-bold py-2 text-sm">Total</TableHead>
        <TableHead className="font-bold py-2 text-sm">Actions</TableHead>
      </TableRow>
    </TableHeader>
  );
}
