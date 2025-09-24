import React, { useState } from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check, X, Upload, FileText, Trash2 } from 'lucide-react';
import { useIssueMutations } from '@/hooks/useIssueMutations';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface AddIssueRowProps {
  category: string;
  onCancel: () => void;
  onSuccess: () => void;
}

export function AddIssueRow({ category, onCancel, onSuccess }: AddIssueRowProps) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<'Normal' | 'High'>('Normal');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  
  const { createIssue } = useIssueMutations();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(prev => [...prev, ...files]);
    event.target.value = '';
  };

  const handleFileRemove = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFilesToIssue = async (issueId: string) => {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    try {
      for (const file of selectedFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${issueId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('issue-files')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { error: dbError } = await supabase
          .from('issue_files')
          .insert({
            issue_id: issueId,
            file_name: file.name,
            file_path: filePath,
            file_size: file.size,
            file_type: file.type,
            uploaded_by: (await supabase.auth.getUser()).data.user?.id
          });

        if (dbError) throw dbError;
      }
    } catch (error) {
      console.error('Error uploading files:', error);
      toast({
        title: "Error",
        description: "Failed to upload some files",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    console.log('🚀 AddIssueRow handleSave called', { title: title.trim(), category, priority });
    
    if (!title.trim()) {
      console.log('❌ Save blocked: No title provided');
      return;
    }

    console.log('📝 Creating issue with data:', {
      title: title.trim(),
      category,
      priority,
    });

    createIssue.mutate({
      title: title.trim(),
      category,
      priority,
    }, {
      onSuccess: async (newIssue: any) => {
        console.log('✅ Issue created successfully:', newIssue);
        if (selectedFiles.length > 0) {
          console.log('📁 Uploading files...', selectedFiles.length);
          await uploadFilesToIssue(newIssue.id);
        }
        onSuccess();
      },
      onError: (error: any) => {
        console.error('❌ Error creating issue:', error);
        toast({
          title: "Error",
          description: "Failed to create issue. Please try again.",
          variant: "destructive",
        });
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
      
      <TableCell className="py-2 text-sm font-medium text-muted-foreground">
        You
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

      <TableCell className="py-2">
        <div className="flex flex-wrap items-center gap-2">
          {/* Add Files Button */}
          <Button
            size="sm"
            variant="ghost"
            disabled={uploading}
            className="h-8 px-2 text-xs"
            onClick={() => document.getElementById('add-issue-file-input')?.click()}
          >
            <Upload className="h-3 w-3 mr-1" />
            {uploading ? 'Uploading...' : 'Add Files'}
          </Button>
          
          <Input
            id="add-issue-file-input"
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          
          {/* Selected Files */}
          {selectedFiles.map((file, index) => (
            <div 
              key={index}
              className="flex items-center gap-1 bg-muted/20 rounded px-2 py-1"
            >
              <FileText className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs max-w-[100px] truncate" title={file.name}>
                {file.name}
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleFileRemove(index)}
                className="h-4 w-4 p-0 hover:bg-destructive/10"
              >
                <Trash2 className="h-3 w-3 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
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