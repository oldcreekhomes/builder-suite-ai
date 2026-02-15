import React from 'react';
import { TableHead, TableHeader, TableRow } from '@/components/ui/table';

export function IssuesTableHeader() {
  return (
    <TableHeader>
      <TableRow>
        <TableHead className="w-12">#</TableHead>
        <TableHead className="w-20">Author</TableHead>
        <TableHead>Title</TableHead>
        <TableHead className="w-20">Priority</TableHead>
        <TableHead className="w-28">Issue Files</TableHead>
        <TableHead className="w-24">Location</TableHead>
        <TableHead>Solution Files</TableHead>
        <TableHead className="w-20">Comment</TableHead>
        <TableHead className="w-16">Actions</TableHead>
      </TableRow>
    </TableHeader>
  );
}