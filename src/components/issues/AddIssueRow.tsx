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
  const [location, setLocation] = useState<string>('');
  
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
    if (!title.trim()) return;

    createIssue.mutate({
      title: title.trim(),
      category,
      priority,
      location,
    }, {
      onSuccess: async (newIssue: any) => {
        if (selectedFiles.length > 0) {
          await uploadFilesToIssue(newIssue.id);
        }
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
    <TableRow className="h-10 bg-muted/30">
      <TableCell className="px-2 py-1 text-xs font-medium text-muted-foreground">
        New
      </TableCell>
      
      <TableCell className="px-2 py-1 text-xs font-medium text-muted-foreground">
        You
      </TableCell>
      
      <TableCell className="px-2 py-1">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter issue title..."
          className="h-6 text-xs"
          autoFocus
        />
      </TableCell>
      
      <TableCell className="px-2 py-1">
        <Select value={priority} onValueChange={(value) => setPriority(value as 'Normal' | 'High')}>
          <SelectTrigger className="h-auto w-full p-1 border-0 bg-transparent text-xs font-normal hover:bg-accent/50 rounded-sm transition-colors focus:ring-0 focus:outline-0 [&>svg]:hidden">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-background border-border shadow-lg z-50">
            <SelectItem value="Normal" className="text-xs hover:bg-accent">Normal</SelectItem>
            <SelectItem value="High" className="text-xs hover:bg-accent">High</SelectItem>
          </SelectContent>
        </Select>
      </TableCell>

      <TableCell className="px-2 py-1">
        <Button
          variant="outline"
          size="sm"
          disabled={uploading}
          className="h-6 text-xs px-2"
          onClick={() => document.getElementById(`add-issue-file-input-${Math.random()}`)?.click()}
        >
          {uploading ? 'Uploading...' : 'Add Files'}
        </Button>
      </TableCell>

      <TableCell className="px-2 py-1">
        <Select value={location} onValueChange={setLocation}>
          <SelectTrigger className="h-auto w-full p-1 border-0 bg-transparent text-xs font-normal hover:bg-accent/50 rounded-sm transition-colors focus:ring-0 focus:outline-0 [&>svg]:hidden">
            <SelectValue placeholder="Select location" />
          </SelectTrigger>
          <SelectContent className="bg-background border-border shadow-lg z-50">
            <SelectItem value="messages" className="text-xs hover:bg-accent">Messages</SelectItem>
            <SelectItem value="files" className="text-xs hover:bg-accent">Files</SelectItem>
            <SelectItem value="photos" className="text-xs hover:bg-accent">Photos</SelectItem>
            <SelectItem value="budget" className="text-xs hover:bg-accent">Budget</SelectItem>
            <SelectItem value="bidding" className="text-xs hover:bg-accent">Bidding</SelectItem>
            <SelectItem value="schedule" className="text-xs hover:bg-accent">Schedule</SelectItem>
            <SelectItem value="authentication" className="text-xs hover:bg-accent">Authentication</SelectItem>
          </SelectContent>
        </Select>
      </TableCell>

      <TableCell className="px-2 py-1">
        {/* Empty cell for solution files */}
      </TableCell>
      
      <TableCell className="px-2 py-1">
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleSave}
            disabled={!title.trim() || createIssue.isPending}
            className="h-6 w-6 p-0"
          >
            <Check className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onCancel}
            className="h-6 w-6 p-0"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}