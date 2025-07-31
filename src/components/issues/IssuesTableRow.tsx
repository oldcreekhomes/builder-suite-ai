import React, { useState } from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DeleteButton } from '@/components/ui/delete-button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import type { CompanyIssue } from '@/hooks/useCompanyIssues';

interface IssuesTableRowProps {
  issue: CompanyIssue;
  issueNumber: number;
  onUpdate: (id: string, updates: { title?: string; description?: string; priority?: 'Normal' | 'High' }) => void;
  onUpdateStatus: (id: string, status: 'Open' | 'Resolved') => void;
  onDelete: (id: string) => void;
  isDeleting?: boolean;
}

export function IssuesTableRow({ 
  issue, 
  issueNumber,
  onUpdate,
  onUpdateStatus,
  onDelete,
  isDeleting = false
}: IssuesTableRowProps) {
  const [title, setTitle] = useState(issue.title);
  const [description, setDescription] = useState(issue.description || '');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);

  const handleTitleBlur = () => {
    if (title !== issue.title) {
      onUpdate(issue.id, { title });
    }
    setIsEditingTitle(false);
  };

  const handleDescriptionBlur = () => {
    if (description !== (issue.description || '')) {
      onUpdate(issue.id, { description });
    }
    setIsEditingDescription(false);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    } else if (e.key === 'Escape') {
      setTitle(issue.title);
      setIsEditingTitle(false);
    }
  };

  const handleDescriptionKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      e.currentTarget.blur();
    } else if (e.key === 'Escape') {
      setDescription(issue.description || '');
      setIsEditingDescription(false);
    }
  };

  const handlePriorityChange = (priority: 'Normal' | 'High') => {
    onUpdate(issue.id, { priority });
  };

  const handleStatusChange = (status: 'Open' | 'Resolved') => {
    onUpdateStatus(issue.id, status);
  };

  const getPriorityBadge = (priority: string) => {
    return priority === 'High' ? (
      <Badge variant="destructive" className="text-xs">High</Badge>
    ) : (
      <Badge variant="secondary" className="text-xs">Normal</Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    return status === 'Resolved' ? (
      <Badge variant="outline" className="text-xs text-green-600 border-green-600">Resolved</Badge>
    ) : (
      <Badge variant="default" className="text-xs">Open</Badge>
    );
  };

  return (
    <TableRow className="h-12">
      <TableCell className="py-2 text-sm font-medium">
        {issueNumber}
      </TableCell>
      
      <TableCell className="py-2">
        {isEditingTitle ? (
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleBlur}
            onKeyDown={handleTitleKeyDown}
            className="h-8 text-sm"
            autoFocus
          />
        ) : (
          <div 
            className="min-h-8 px-2 py-1 text-sm cursor-pointer hover:bg-muted/50 rounded border border-transparent hover:border-border flex items-center"
            onClick={() => setIsEditingTitle(true)}
          >
            {title}
          </div>
        )}
      </TableCell>
      
      <TableCell className="py-2">
        {isEditingDescription ? (
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={handleDescriptionBlur}
            onKeyDown={handleDescriptionKeyDown}
            className="min-h-8 text-sm resize-none"
            autoFocus
            rows={2}
          />
        ) : (
          <div 
            className="min-h-8 px-2 py-1 text-sm cursor-pointer hover:bg-muted/50 rounded border border-transparent hover:border-border flex items-center"
            onClick={() => setIsEditingDescription(true)}
          >
            {description || <span className="text-muted-foreground italic">Click to add description</span>}
          </div>
        )}
      </TableCell>
      
      <TableCell className="py-2">
        <Select value={issue.priority} onValueChange={handlePriorityChange}>
          <SelectTrigger className="h-8 text-sm border-transparent hover:border-border">
            <SelectValue>{getPriorityBadge(issue.priority)}</SelectValue>
          </SelectTrigger>
          <SelectContent className="bg-background z-50">
            <SelectItem value="Normal">Normal</SelectItem>
            <SelectItem value="High">High</SelectItem>
          </SelectContent>
        </Select>
      </TableCell>
      
      <TableCell className="py-2">
        <Select value={issue.status} onValueChange={handleStatusChange}>
          <SelectTrigger className="h-8 text-sm border-transparent hover:border-border">
            <SelectValue>{getStatusBadge(issue.status)}</SelectValue>
          </SelectTrigger>
          <SelectContent className="bg-background z-50">
            <SelectItem value="Open">Open</SelectItem>
            <SelectItem value="Resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
      </TableCell>
      
      <TableCell className="py-2 text-sm text-muted-foreground">
        {format(new Date(issue.created_at), 'MMM d, yyyy')}
      </TableCell>
      
      <TableCell className="py-2">
        <DeleteButton
          onDelete={() => onDelete(issue.id)}
          title="Delete Issue"
          description={`Are you sure you want to delete the issue "${issue.title}"? This action cannot be undone.`}
          size="sm"
          variant="ghost"
          isLoading={isDeleting}
          showIcon={true}
          className="h-8"
        />
      </TableCell>
    </TableRow>
  );
}