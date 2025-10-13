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
  const [html, setHtml] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Convert plain text or legacy markdown to HTML for display (backward compatibility)
  const normalizeToHtml = (content: string) => {
    if (!content) return '';
    
    // If already HTML, return as-is
    if (/<[a-z][\s\S]*>/i.test(content)) {
      return content;
    }
    
    // Convert plain text/markdown to HTML
    const text = content.replace(/\r\n?/g, '\n');
    const lines = text.split('\n');
    const htmlParts: string[] = [];
    let i = 0;

    const bulletRe = /^\s*(•|-|\*)\s*(.+)$/;
    const numberRe = /^\s*\d+[\.\)]\s*(.+)$/;

    while (i < lines.length) {
      const line = lines[i].trim();

      if (!line) { 
        i++; 
        continue; 
      }

      // Bulleted list
      if (bulletRe.test(line)) {
        const items: string[] = [];
        while (i < lines.length) {
          const m = lines[i].trim().match(bulletRe);
          if (m) { 
            items.push(`<li>${m[2]}</li>`); 
            i++; 
          } else if (!lines[i].trim()) { 
            i++; 
            break; 
          } else break;
        }
        htmlParts.push(`<ul>${items.join('')}</ul>`);
        continue;
      }

      // Numbered list
      if (numberRe.test(line)) {
        const items: string[] = [];
        while (i < lines.length) {
          const m = lines[i].trim().match(numberRe);
          if (m) { 
            items.push(`<li>${m[1]}</li>`); 
            i++; 
          } else if (!lines[i].trim()) { 
            i++; 
            break; 
          } else break;
        }
        htmlParts.push(`<ol>${items.join('')}</ol>`);
        continue;
      }

      // Plain paragraph
      htmlParts.push(`<p>${line}</p>`);
      i++;
    }

    return htmlParts.join('');
  };

  useEffect(() => {
    if (specification) {
      setHtml(normalizeToHtml(specification.description || ''));
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

  const formats = ['bold', 'italic', 'underline', 'list', 'indent'] as const;

  const handleSave = async () => {
    if (!specification) return;
    setIsLoading(true);
    try {
      // Store HTML directly - no more conversion
      await onUpdateDescription(specification.id, html);
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
