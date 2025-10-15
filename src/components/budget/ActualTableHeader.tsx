import React from 'react';
import { TableHead, TableHeader, TableRow } from '@/components/ui/table';

export function ActualTableHeader() {
  return (
    <TableHeader>
      <TableRow className="h-8">
        <TableHead className="h-8 px-1 py-0 text-xs font-medium w-12"></TableHead>
        <TableHead className="h-8 px-1 py-0 text-xs font-medium w-20">Cost Code</TableHead>
        <TableHead className="h-8 px-1 py-0 text-xs font-medium w-48">Name</TableHead>
        <TableHead className="h-8 px-2 py-0 text-xs font-medium w-28">Budget</TableHead>
        <TableHead className="h-8 px-2 py-0 text-xs font-medium w-28">Actual Cost</TableHead>
        <TableHead className="h-8 px-2 py-0 text-xs font-medium w-32">Committed Costs</TableHead>
        <TableHead className="h-8 px-2 py-0 text-xs font-medium w-24">Variance</TableHead>
      </TableRow>
    </TableHeader>
  );
}