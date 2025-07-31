import React from 'react';
import { TableHead, TableHeader, TableRow } from '@/components/ui/table';

export function IssuesTableHeader() {
  return (
    <TableHeader>
      <TableRow className="h-10">
        <TableHead className="font-bold w-16 py-2 text-sm">#</TableHead>
        <TableHead className="font-bold py-2 text-sm w-64">Title</TableHead>
        <TableHead className="font-bold py-2 text-sm w-20">Priority</TableHead>
        <TableHead className="font-bold py-2 text-sm w-32">Files</TableHead>
        <TableHead className="font-bold py-2 text-sm w-20">Actions</TableHead>
      </TableRow>
    </TableHeader>
  );
}