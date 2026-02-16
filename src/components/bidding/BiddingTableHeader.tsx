
import React from 'react';
import { TableHead, TableHeader, TableRow } from '@/components/ui/table';

export function BiddingTableHeader() {
  return (
    <TableHeader>
      <TableRow>
        <TableHead className="w-12"></TableHead>
        <TableHead>Cost Code</TableHead>
        <TableHead>Status</TableHead>
        <TableHead className="w-32">Sent On</TableHead>
        <TableHead className="w-32">Due Date</TableHead>
        <TableHead className="w-32">Reminder Date</TableHead>
        <TableHead>Specifications</TableHead>
        <TableHead>Files</TableHead>
        <TableHead className="text-center">Actions</TableHead>
      </TableRow>
    </TableHeader>
  );
}
