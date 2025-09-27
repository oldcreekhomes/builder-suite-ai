import React from 'react';
import { TableHead, TableHeader, TableRow } from '@/components/ui/table';

export function IssuesTableHeader() {
  return (
    <TableHeader>
      <TableRow className="h-10">
        <TableHead className="font-bold w-12 py-2 text-sm">#</TableHead>
        <TableHead className="font-bold py-2 text-sm w-20">Author</TableHead>
        <TableHead className="font-bold py-2 text-sm">Title</TableHead>
        <TableHead className="font-bold py-2 text-sm w-20">Priority</TableHead>
        <TableHead className="font-bold py-2 text-sm w-28">Files</TableHead>
        <TableHead className="font-bold py-2 text-sm">Solution</TableHead>
        <TableHead className="font-bold py-2 text-sm w-16">Actions</TableHead>
      </TableRow>
    </TableHeader>
  );
}