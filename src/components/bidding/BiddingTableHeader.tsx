
import React from 'react';
import { TableHead, TableHeader, TableRow } from '@/components/ui/table';

export function BiddingTableHeader() {
  return (
    <TableHeader>
      <TableRow>
        <TableHead className="w-10"></TableHead>
        <TableHead className="w-40">Cost Code</TableHead>
        <TableHead className="w-32">Status</TableHead>
        <TableHead className="w-32">Sent On</TableHead>
        <TableHead className="w-32">Due Date</TableHead>
        <TableHead className="w-32">Reminder Date</TableHead>
        <TableHead className="w-32">Specifications</TableHead>
        <TableHead className="w-40">Files</TableHead>
        <TableHead className="w-16 text-center">Actions</TableHead>
      </TableRow>
    </TableHeader>
  );
}
