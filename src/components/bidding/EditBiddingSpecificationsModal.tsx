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
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

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
    let html = markdown;
    
    // Group consecutive bullet points into single <ul>
    html = html.replace(/(^•\s+.+$\n?)+/gm, (match) => {
      const items = match
        .split('\n')
        .filter(line => line.trim())
        .map(line => line.replace(/^•\s+/, ''))
        .map(item => `<li>${item}</li>`)
        .join('');
      return `<ul>${items}</ul>`;
    });
    
    // Group consecutive numbered items into single <ol>
    html = html.replace(/(^\d+\.\s+.+$\n?)+/gm, (match) => {
      const items = match
        .split('\n')
        .filter(line => line.trim())
        .map(line => line.replace(/^\d+\.\s+/, ''))
        .map(item => `<li>${item}</li>`)
        .join('');
      return `<ol>${items}</ol>`;
    });
    
    // Apply other formatting
    html = html
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/__(.*?)__/g, '<u>$1</u>')
      .replace(/^\s{4}(.+)$/gm, '<div style="margin-left: 20px;">$1</div>')
      .replace(/\n/g, '<br />');
    
    return html;
  };

  const htmlToMarkdown = (value: string) => {
    let text = value;
    
    // Handle unordered lists (bullet points) - process entire <ul> blocks
    text = text.replace(/<ul>(.*?)<\/ul>/gs, (match, content) => {
      return content
        .replace(/<li>(.*?)<\/li>/gs, (_, item) => `• ${item.trim()}\n`)
        .trim();
    });
    
    // Handle ordered lists (numbered lists) - process entire <ol> blocks
    text = text.replace(/<ol>(.*?)<\/ol>/gs, (match, content) => {
      let counter = 1;
      return content
        .replace(/<li>(.*?)<\/li>/gs, (_, item) => `${counter++}. ${item.trim()}\n`)
        .trim();
    });
    
    // Handle other formatting
    text = text
      .replace(/<strong>(.*?)<\/strong>/gs, '**$1**')
      .replace(/<em>(.*?)<\/em>/gs, '*$1*')
      .replace(/<u>(.*?)<\/u>/gs, '__$1__')
      .replace(/<div style="margin-left: 20px;">(.*?)<\/div>/gs, '    $1')
      .replace(/<p>(.*?)<\/p>/gs, '$1\n')
      .replace(/<br\s*\/?>/g, '\n')
      .replace(/<[^>]+>/g, '');
    
    return text.trim();
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
            <div className="rounded-md">
              <ReactQuill
                theme="snow"
                value={html}
                onChange={setHtml}
                modules={modules as any}
                formats={formats as any}
                readOnly={isReadOnly}
                style={{ 
                  height: '300px',
                  marginBottom: '50px'
                }}
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
