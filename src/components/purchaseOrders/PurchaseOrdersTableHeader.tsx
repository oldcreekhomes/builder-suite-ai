import React from 'react';
import { TableHead, TableHeader, TableRow } from '@/components/ui/table';

export function PurchaseOrdersTableHeader() {
  return (
    <TableHeader>
      <TableRow>
        <TableHead className="w-12"></TableHead>
        <TableHead>PO Number</TableHead>
        <TableHead>Cost Code</TableHead>
        <TableHead>Company</TableHead>
        <TableHead>Amount</TableHead>
        <TableHead>Sent On</TableHead>
        <TableHead>Files</TableHead>
        <TableHead className="text-center">Actions</TableHead>
      </TableRow>
    </TableHeader>
  );
}
