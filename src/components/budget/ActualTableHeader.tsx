import React from 'react';
import { TableHead, TableHeader, TableRow } from '@/components/ui/table';

export function ActualTableHeader() {
  return (
    <TableHeader>
      <TableRow>
        <TableHead className="w-12"></TableHead>
        <TableHead className="w-20">Cost Code</TableHead>
        <TableHead className="w-48">Name</TableHead>
        <TableHead className="w-28">Budget</TableHead>
        <TableHead className="w-28">Actual Cost</TableHead>
        <TableHead className="w-32">Committed Costs</TableHead>
        <TableHead className="w-24">Variance</TableHead>
        <TableHead className="w-20 sticky right-0 bg-background z-30">Actions</TableHead>
      </TableRow>
    </TableHeader>
  );
}