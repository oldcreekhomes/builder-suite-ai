import React from 'react';
import { TableHead, TableHeader, TableRow } from '@/components/ui/table';

export function ActualTableHeader() {
  return (
    <TableHeader>
      <TableRow className="h-8">
        <TableHead className="h-8 px-1 py-0 text-xs font-medium w-12"></TableHead>
        <TableHead className="h-8 px-1 py-0 text-xs font-medium">Cost Code</TableHead>
        <TableHead className="h-8 px-1 py-0 text-xs font-medium">Name</TableHead>
        <TableHead className="h-8 px-1 py-0 text-xs font-medium text-right">Budget</TableHead>
        <TableHead className="h-8 px-1 py-0 text-xs font-medium text-right">Actual</TableHead>
        <TableHead className="h-8 px-1 py-0 text-xs font-medium text-right">Variance</TableHead>
        <TableHead className="h-8 px-1 py-0 text-xs font-medium">Historical</TableHead>
      </TableRow>
    </TableHeader>
  );
}