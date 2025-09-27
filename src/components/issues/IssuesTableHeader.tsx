import React from 'react';
import { TableHead, TableHeader, TableRow } from '@/components/ui/table';

export function IssuesTableHeader() {
  return (
    <TableHeader>
      <TableRow className="h-8">
        <TableHead className="h-8 px-2 py-1 text-xs font-medium w-12">#</TableHead>
        <TableHead className="h-8 px-2 py-1 text-xs font-medium w-20">Author</TableHead>
        <TableHead className="h-8 px-2 py-1 text-xs font-medium">Title</TableHead>
        <TableHead className="h-8 px-2 py-1 text-xs font-medium w-20">Priority</TableHead>
        <TableHead className="h-8 px-2 py-1 text-xs font-medium w-28">Issue Files</TableHead>
        <TableHead className="h-8 px-2 py-1 text-xs font-medium w-24">Location</TableHead>
        <TableHead className="h-8 px-2 py-1 text-xs font-medium">Solution Files</TableHead>
        <TableHead className="h-8 px-2 py-1 text-xs font-medium w-16">Actions</TableHead>
      </TableRow>
    </TableHeader>
  );
}