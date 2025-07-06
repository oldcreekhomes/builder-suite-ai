import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  Bold, 
  Italic, 
  Underline, 
  List, 
  ListOrdered, 
  Indent, 
  Outdent,
  Eye,
  Edit3
} from 'lucide-react';

interface EditBiddingSpecificationsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  costCodeName: string;
  costCodeCode: string;
  specifications: string;
  onUpdateSpecifications: (specifications: string) => Promise<void>;
}

export function EditBiddingSpecificationsModal({
  open,
  onOpenChange,
  costCodeName,
  costCodeCode,
  specifications,
  onUpdateSpecifications
}: EditBiddingSpecificationsModalProps) {
  const [description, setDescription] = useState(specifications || '');
  const [isLoading, setIsLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    setDescription(specifications || '');
  }, [specifications]);

  const insertText = (before: string, after: string = '', placeholder: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = description.substring(start, end);
    const textToInsert = selectedText || placeholder;
    
    const newText = description.substring(0, start) + before + textToInsert + after + description.substring(end);
    setDescription(newText);
    
    // Focus and set cursor position
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + before.length + textToInsert.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const insertAtLineStart = (prefix: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const beforeCursor = description.substring(0, start);
    const afterCursor = description.substring(start);
    
    // Find the start of the current line
    const lastNewline = beforeCursor.lastIndexOf('\n');
    const lineStart = lastNewline === -1 ? 0 : lastNewline + 1;
    const currentLine = description.substring(lineStart, start);
    
    // Check if line already has the prefix
    if (currentLine.startsWith(prefix)) {
      // Remove prefix
      const newText = description.substring(0, lineStart) + 
                     currentLine.substring(prefix.length) + 
                     description.substring(start);
      setDescription(newText);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start - prefix.length, start - prefix.length);
      }, 0);
    } else {
      // Add prefix
      const newText = description.substring(0, lineStart) + 
                     prefix + currentLine + 
                     description.substring(start);
      setDescription(newText);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + prefix.length, start + prefix.length);
      }, 0);
    }
  };

  const handleIndent = () => {
    insertAtLineStart('    '); // 4 spaces for indent
  };

  const handleOutdent = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const beforeCursor = description.substring(0, start);
    const lastNewline = beforeCursor.lastIndexOf('\n');
    const lineStart = lastNewline === -1 ? 0 : lastNewline + 1;
    const currentLine = description.substring(lineStart);
    
    if (currentLine.startsWith('    ')) {
      const newText = description.substring(0, lineStart) + 
                     currentLine.substring(4);
      setDescription(newText);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(Math.max(start - 4, lineStart), Math.max(start - 4, lineStart));
      }, 0);
    }
  };

  const formatText = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/__(.*?)__/g, '<u>$1</u>')
      .replace(/^• (.+)$/gm, '<li>$1</li>')
      .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
      .replace(/^    (.+)$/gm, '<div style="margin-left: 20px;">$1</div>')
      .replace(/\n/g, '<br>');
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await onUpdateSpecifications(description);
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating specifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Edit Specifications</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label>Cost Code</Label>
            <div className="text-sm text-gray-600">
              {costCodeCode} - {costCodeName}
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="description">Specifications</Label>
              <div className="flex items-center space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPreview(!showPreview)}
                  className="flex items-center space-x-1"
                >
                  {showPreview ? <Edit3 className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  <span>{showPreview ? 'Edit' : 'Preview'}</span>
                </Button>
              </div>
            </div>
            
            {!showPreview && (
              <>
                {/* Formatting Toolbar */}
                <div className="flex items-center space-x-1 p-2 border rounded-t-md bg-gray-50">
                  <div className="flex items-center space-x-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => insertText('**', '**', 'bold text')}
                      title="Bold"
                    >
                      <Bold className="h-3 w-3" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => insertText('*', '*', 'italic text')}
                      title="Italic"
                    >
                      <Italic className="h-3 w-3" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => insertText('__', '__', 'underlined text')}
                      title="Underline"
                    >
                      <Underline className="h-3 w-3" />
                    </Button>
                  </div>
                  
                  <Separator orientation="vertical" className="h-6" />
                  
                  <div className="flex items-center space-x-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => insertAtLineStart('• ')}
                      title="Bullet Point"
                    >
                      <List className="h-3 w-3" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => insertAtLineStart('1. ')}
                      title="Numbered List"
                    >
                      <ListOrdered className="h-3 w-3" />
                    </Button>
                  </div>
                  
                  <Separator orientation="vertical" className="h-6" />
                  
                  <div className="flex items-center space-x-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleIndent}
                      title="Indent"
                    >
                      <Indent className="h-3 w-3" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleOutdent}
                      title="Outdent"
                    >
                      <Outdent className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                
                <Textarea
                  ref={textareaRef}
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter bid package specifications..."
                  rows={8}
                  className="rounded-t-none font-mono text-sm"
                />
                
                <div className="text-xs text-gray-500 mt-1">
                  Tip: Use **bold**, *italic*, __underline__, • bullets, 1. numbers, and indenting
                </div>
              </>
            )}
            
            {showPreview && (
              <div 
                className="border rounded-md p-3 min-h-[200px] bg-white"
                dangerouslySetInnerHTML={{ __html: formatText(description) }}
              />
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}