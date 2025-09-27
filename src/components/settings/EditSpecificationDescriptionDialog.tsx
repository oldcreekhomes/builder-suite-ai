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
import type { Tables } from '@/integrations/supabase/types';

// Types
type CostCode = Tables<'cost_codes'>;
type CostCodeSpecification = Tables<'cost_code_specifications'>;

type SpecificationWithCostCode = CostCodeSpecification & {
  cost_code: CostCode;
};

interface EditSpecificationDescriptionDialogProps {
  specification: SpecificationWithCostCode | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateDescription: (specId: string, description: string) => Promise<void>;
}

export function EditSpecificationDescriptionDialog({
  specification,
  open,
  onOpenChange,
  onUpdateDescription,
}: EditSpecificationDescriptionDialogProps) {
  // We keep HTML in state for true WYSIWYG editing
  const [html, setHtml] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Convert simple markdown stored in DB to HTML for editing
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

  // Convert edited HTML back to markdown for storage (to remain backward compatible)
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
    if (specification) {
      setHtml(markdownToHtml(specification.description || ''));
    } else {
      setHtml('');
    }
  }, [specification]);

  const modules = {
    toolbar: [
      ['bold', 'italic', 'underline'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      [{ indent: '-1' }, { indent: '+1' }],
      ['clean'],
    ],
  } as const;

  const formats = ['bold', 'italic', 'underline', 'list', 'indent', 'clean'] as const;

  const handleSave = async () => {
    if (!specification) return;
    setIsLoading(true);
    try {
      const markdown = htmlToMarkdown(html);
      await onUpdateDescription(specification.id, markdown);
      onOpenChange(false);
    } catch (e) {
      console.error('Error updating description:', e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Edit Description</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label>Cost Code</Label>
            <div className="text-sm text-gray-600">
              {specification?.cost_code.code} - {specification?.cost_code.name}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <div className="rounded-md">
              <ReactQuill
                theme="snow"
                value={html}
                onChange={setHtml}
                modules={modules as any}
                formats={formats as any}
                style={{ 
                  height: '300px',
                  marginBottom: '50px'
                }}
              />
            </div>
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
