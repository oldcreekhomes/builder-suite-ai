import React, { useState } from 'react';
import { TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Plus, StickyNote } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface IssueCommentCellProps {
  issueId: string;
  comment?: string | null;
  onCommentChange: (comment: string) => void;
}

export function IssueCommentCell({ 
  issueId, 
  comment, 
  onCommentChange 
}: IssueCommentCellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [localComment, setLocalComment] = useState(comment || '');

  const hasComment = !!comment && comment.trim().length > 0;

  const handleOpen = () => {
    setLocalComment(comment || '');
    setIsOpen(true);
  };

  const handleSave = () => {
    onCommentChange(localComment);
    setIsOpen(false);
  };

  const handleCancel = () => {
    setLocalComment(comment || '');
    setIsOpen(false);
  };

  return (
    <TableCell className="px-2 py-1 w-20">
      <Button
        size="sm"
        variant="ghost"
        onClick={handleOpen}
        className="h-6 w-6 p-0 hover:bg-accent/50"
        title={hasComment ? 'View/Edit Comment' : 'Add Comment'}
      >
        {hasComment ? (
          <StickyNote className="h-3 w-3 text-yellow-600" />
        ) : (
          <Plus className="h-3 w-3 text-muted-foreground" />
        )}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {hasComment ? 'Edit Comment' : 'Add Comment'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <Textarea
              value={localComment}
              onChange={(e) => setLocalComment(e.target.value)}
              placeholder="Write a comment explaining the resolution..."
              className="min-h-[120px] resize-none"
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              This comment will be included in the email sent to the author when the issue is closed.
            </p>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TableCell>
  );
}
