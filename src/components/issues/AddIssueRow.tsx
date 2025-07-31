import React, { useState } from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check, X } from 'lucide-react';
import { useIssueMutations } from '@/hooks/useIssueMutations';

interface AddIssueRowProps {
  category: string;
  onCancel: () => void;
  onSuccess: () => void;
}

export function AddIssueRow({ category, onCancel, onSuccess }: AddIssueRowProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'Normal' | 'High'>('Normal');
  
  const { createIssue } = useIssueMutations();

  const handleSave = () => {
    if (!title.trim()) return;

    createIssue.mutate({
      title: title.trim(),
      description: description.trim() || null,
      category,
      priority,
    }, {
      onSuccess: () => {
        onSuccess();
      }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <TableRow className="h-12 bg-muted/30">
      <TableCell className="py-2 text-sm font-medium text-muted-foreground">
        New
      </TableCell>
      
      <TableCell className="py-2">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter issue title..."
          className="h-8 text-sm"
          autoFocus
        />
      </TableCell>
      
      <TableCell className="py-2">
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter description (optional)..."
          className="min-h-8 text-sm resize-none"
          rows={2}
        />
      </TableCell>
      
      <TableCell className="py-2">
        <Select value={priority} onValueChange={(value) => setPriority(value as 'Normal' | 'High')}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-background z-50">
            <SelectItem value="Normal">Normal</SelectItem>
            <SelectItem value="High">High</SelectItem>
          </SelectContent>
        </Select>
      </TableCell>
      
      <TableCell className="py-2 text-sm text-muted-foreground">
        Open
      </TableCell>
      
      <TableCell className="py-2 text-sm text-muted-foreground">
        Today
      </TableCell>
      
      <TableCell className="py-2">
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleSave}
            disabled={!title.trim() || createIssue.isPending}
            className="h-8 w-8 p-0"
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onCancel}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}