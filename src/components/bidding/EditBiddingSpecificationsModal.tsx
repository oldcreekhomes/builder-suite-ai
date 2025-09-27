import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

interface EditBiddingSpecificationsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  costCodeName: string;
  costCodeCode: string;
  specifications: string;
  onUpdateSpecifications: (specifications: string) => Promise<void>;
  isReadOnly?: boolean;
}

export function EditBiddingSpecificationsModal({
  open,
  onOpenChange,
  costCodeName,
  costCodeCode,
  specifications,
  onUpdateSpecifications,
  isReadOnly = false,
}: EditBiddingSpecificationsModalProps) {
  // Keep HTML in state for WYSIWYG
  const [html, setHtml] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const markdownToHtml = (markdown: string) => {
    return markdown
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/__(.*?)__/g, '<u>$1</u>')
      .replace(/^•\s+(.+)$/gm, '<ul><li>$1</li></ul>')
      .replace(/^\d+\.\s+(.+)$/gm, '<ol><li>$1</li></ol>')
      .replace(/^\s{4}(.+)$/gm, '<div style="margin-left: 20px;">$1</div>')
      .replace(/\n/g, '<br />');
  };

  const htmlToMarkdown = (value: string) => {
    let text = value
      .replace(/<strong>(.*?)<\/strong>/g, '**$1**')
      .replace(/<em>(.*?)<\/em>/g, '*$1*')
      .replace(/<u>(.*?)<\/u>/g, '__$1__')
      .replace(/<ol>\s*<li>(.*?)<\/li>\s*<\/ol>/gs, (_m, p1) => `1. ${p1}`)
      .replace(/<ul>\s*<li>(.*?)<\/li>\s*<\/ul>/gs, (_m, p1) => `• ${p1}`)
      .replace(/<div style="margin-left: 20px;">(.*?)<\/div>/g, '    $1')
      .replace(/<br\s*\/?\s*>/g, '\n')
      .replace(/<[^>]+>/g, '');
    return text;
  };

  useEffect(() => {
    setHtml(markdownToHtml(specifications || ''));
  }, [specifications]);

  const modules = isReadOnly
    ? { toolbar: false }
    : {
        toolbar: [
          ['bold', 'italic', 'underline'],
          [{ list: 'ordered' }, { list: 'bullet' }],
          [{ indent: '-1' }, { indent: '+1' }],
          ['clean'],
        ],
      } as const;

  const formats = ['bold', 'italic', 'underline', 'list', 'indent', 'clean'] as const;

  const handleSave = async () => {
    if (isReadOnly) return onOpenChange(false);
    setIsLoading(true);
    try {
      const markdown = htmlToMarkdown(html);
      await onUpdateSpecifications(markdown);
      onOpenChange(false);
    } catch (e) {
      console.error('Error updating specifications:', e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{isReadOnly ? 'View Specifications' : 'Edit Specifications'}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label>Cost Code</Label>
            <div className="text-sm text-gray-600">
              {costCodeCode} - {costCodeName}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Specifications</Label>
            <div className="rounded-md border">
              <ReactQuill
                theme="snow"
                value={html}
                onChange={setHtml}
                modules={modules as any}
                formats={formats as any}
                readOnly={isReadOnly}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          {isReadOnly ? (
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isLoading}>
                {isLoading ? 'Saving...' : 'Save'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
