
import React from 'react';
import { TableHead, TableHeader, TableRow } from '@/components/ui/table';

export function BiddingTableHeader() {
  return (
    <TableHeader>
      <TableRow>
        <TableHead className="w-10"></TableHead>
        <TableHead className="w-56">Cost Code</TableHead>
        <TableHead className="w-28">Status</TableHead>
        <TableHead className="w-28">Sent On</TableHead>
        <TableHead className="w-28">Due Date</TableHead>
        <TableHead className="w-28">Reminder Date</TableHead>
        <TableHead className="w-24">Specifications</TableHead>
        <TableHead>Files</TableHead>
        <TableHead className="w-20 text-center">Actions</TableHead>
      </TableRow>
    </TableHeader>
  );
}
