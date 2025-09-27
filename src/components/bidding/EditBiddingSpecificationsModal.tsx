import React, { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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
  isReadOnly?: boolean;
}

export function EditBiddingSpecificationsModal({
  open,
  onOpenChange,
  costCodeName,
  costCodeCode,
  specifications,
  onUpdateSpecifications,
  isReadOnly = false
}: EditBiddingSpecificationsModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(isReadOnly);
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (specifications && editorRef.current) {
      // Convert markdown to HTML for display
      const htmlContent = convertMarkdownToHtml(specifications || '');
      editorRef.current.innerHTML = htmlContent;
    }
  }, [specifications]);

  useEffect(() => {
    if (isReadOnly) {
      setShowPreview(true);
    }
  }, [isReadOnly]);

  const convertMarkdownToHtml = (markdown: string) => {
    return markdown
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/__(.*?)__/g, '<u>$1</u>')
      .replace(/^• (.+)$/gm, '<ul><li>$1</li></ul>')
      .replace(/^\d+\. (.+)$/gm, '<ol><li>$1</li></ol>')
      .replace(/^    (.+)$/gm, '<div style="margin-left: 20px;">$1</div>')
      .replace(/\n/g, '<br>');
  };

  const convertHtmlToMarkdown = (html: string) => {
    const div = document.createElement('div');
    div.innerHTML = html;
    
    // Convert back to markdown-style formatting for storage
    let text = div.innerHTML
      .replace(/<strong>(.*?)<\/strong>/g, '**$1**')
      .replace(/<em>(.*?)<\/em>/g, '*$1*')
      .replace(/<u>(.*?)<\/u>/g, '__$1__')
      .replace(/<li>(.*?)<\/li>/g, '• $1')
      .replace(/<ul>|<\/ul>|<ol>|<\/ol>/g, '')
      .replace(/<div style="margin-left: 20px;">(.*?)<\/div>/g, '    $1')
      .replace(/<br>/g, '\n')
      .replace(/<[^>]*>/g, ''); // Remove any remaining HTML tags
    
    return text;
  };

  const execCommand = (command: string, value: string = '') => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  const handleBold = () => execCommand('bold');
  const handleItalic = () => execCommand('italic');
  const handleUnderline = () => execCommand('underline');
  
  const handleBulletList = () => {
    execCommand('insertUnorderedList');
  };
  
  const handleNumberedList = () => {
    execCommand('insertOrderedList');
  };

  const handleIndent = () => execCommand('indent');
  const handleOutdent = () => execCommand('outdent');

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
    if (!editorRef.current) return;
    
    setIsLoading(true);
    try {
      const htmlContent = editorRef.current.innerHTML;
      const markdownContent = convertHtmlToMarkdown(htmlContent);
      await onUpdateSpecifications(markdownContent);
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
            <div className="flex items-center justify-between">
              <Label htmlFor="description">Specifications</Label>
              {!isReadOnly && (
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
              )}
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
                      onClick={handleBold}
                      title="Bold"
                    >
                      <Bold className="h-3 w-3" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleItalic}
                      title="Italic"
                    >
                      <Italic className="h-3 w-3" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleUnderline}
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
                      onClick={handleBulletList}
                      title="Bullet Point"
                    >
                      <List className="h-3 w-3" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleNumberedList}
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
                
                <div
                  ref={editorRef}
                  contentEditable
                  className="min-h-[200px] w-full rounded-b-md border border-t-0 border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  style={{ maxHeight: '300px', overflowY: 'auto' }}
                  suppressContentEditableWarning={true}
                />
                
                <div className="text-xs text-gray-500 mt-1">
                  Use the toolbar buttons to format your text. Text will appear formatted as you type.
                </div>
              </>
            )}
            
            {showPreview && (
              <div className="border rounded-md p-3 min-h-[200px] bg-white">
                {specifications?.trim() ? (
                  <div dangerouslySetInnerHTML={{ __html: formatText(specifications) }} />
                ) : (
                  <div className="text-gray-500 text-center py-8">
                    {isReadOnly ? 'No specifications added yet.' : 'No content to preview. Start typing to see a preview.'}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          {isReadOnly ? (
            <Button onClick={() => onOpenChange(false)}>
              Close
            </Button>
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