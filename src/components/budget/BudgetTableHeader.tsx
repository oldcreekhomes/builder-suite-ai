
import React from 'react';
import { TableHead, TableHeader, TableRow } from '@/components/ui/table';

export function BudgetTableHeader() {
  return (
    <TableHeader>
      <TableRow>
        <TableHead className="font-bold">Cost Code</TableHead>
        <TableHead className="font-bold">Name</TableHead>
        <TableHead className="font-bold">Quantity</TableHead>
        <TableHead className="font-bold">Unit</TableHead>
        <TableHead className="font-bold">Price</TableHead>
        <TableHead className="font-bold">Total</TableHead>
        <TableHead className="font-bold">Actions</TableHead>
      </TableRow>
    </TableHeader>
  );
}
