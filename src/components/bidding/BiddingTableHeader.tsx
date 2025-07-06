
import React from 'react';
import { TableHead, TableHeader, TableRow } from '@/components/ui/table';

export function BiddingTableHeader() {
  return (
    <TableHeader>
      <TableRow className="h-10">
        <TableHead className="font-bold w-12 py-2 text-sm"></TableHead>
        <TableHead className="font-bold py-2 text-sm">Cost Code</TableHead>
        <TableHead className="font-bold py-2 text-sm">Status</TableHead>
        <TableHead className="font-bold py-2 text-sm w-32">Due Date</TableHead>
        <TableHead className="font-bold py-2 text-sm w-32">Reminder Date</TableHead>
        <TableHead className="font-bold py-2 text-sm">Specifications</TableHead>
        <TableHead className="font-bold py-2 text-sm">Files</TableHead>
        <TableHead className="font-bold py-2 text-sm text-right">Actions</TableHead>
      </TableRow>
    </TableHeader>
  );
}
