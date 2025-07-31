import React, { useState, useEffect } from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DeleteButton } from '@/components/ui/delete-button';
import { Badge } from '@/components/ui/badge';
import { IssueFileUpload } from './IssueFileUpload';
import { supabase } from '@/integrations/supabase/client';
import type { CompanyIssue } from '@/hooks/useCompanyIssues';

interface IssueFile {
  id: string;
  file_name: string;
  file_path: string;
  file_size?: number;
  file_type?: string;
}

interface IssuesTableRowProps {
  issue: CompanyIssue;
  issueNumber: number;
  onUpdate: (id: string, updates: { title?: string; priority?: 'Normal' | 'High' }) => void;
  onDelete: (id: string) => void;
  isDeleting?: boolean;
}

export function IssuesTableRow({ 
  issue, 
  issueNumber,
  onUpdate,
  onDelete,
  isDeleting = false
}: IssuesTableRowProps) {
  const [title, setTitle] = useState(issue.title);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [files, setFiles] = useState<IssueFile[]>([]);

  // Fetch files for this issue
  useEffect(() => {
    const fetchFiles = async () => {
      const { data, error } = await supabase
        .from('issue_files')
        .select('*')
        .eq('issue_id', issue.id);
      
      if (!error && data) {
        setFiles(data);
      }
    };
    
    fetchFiles();
  }, [issue.id]);

  const handleTitleBlur = () => {
    if (title !== issue.title) {
      onUpdate(issue.id, { title });
    }
    setIsEditingTitle(false);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    } else if (e.key === 'Escape') {
      setTitle(issue.title);
      setIsEditingTitle(false);
    }
  };

  const handlePriorityChange = (priority: 'Normal' | 'High') => {
    onUpdate(issue.id, { priority });
  };

  const getPriorityBadge = (priority: string) => {
    return priority === 'High' ? (
      <Badge variant="destructive" className="text-xs">High</Badge>
    ) : (
      <Badge variant="secondary" className="text-xs">Normal</Badge>
    );
  };

  return (
    <TableRow className="h-12">
      <TableCell className="py-2 text-sm font-medium w-16">
        {issueNumber}
      </TableCell>
      
      <TableCell className="py-2 w-64">
        {isEditingTitle ? (
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleBlur}
            onKeyDown={handleTitleKeyDown}
            className="h-8 text-sm"
            autoFocus
          />
        ) : (
          <div 
            className="min-h-8 px-2 py-1 text-sm cursor-pointer hover:bg-muted/50 rounded border border-transparent hover:border-border flex items-center truncate"
            onClick={() => setIsEditingTitle(true)}
            title={title}
          >
            {title}
          </div>
        )}
      </TableCell>
      
      <TableCell className="py-2 w-20">
        <Select value={issue.priority} onValueChange={handlePriorityChange}>
          <SelectTrigger className="h-8 text-sm w-20">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-background z-50">
            <SelectItem value="Normal">Normal</SelectItem>
            <SelectItem value="High">High</SelectItem>
          </SelectContent>
        </Select>
      </TableCell>

      <TableCell className="py-2 w-32">
        <IssueFileUpload 
          issueId={issue.id}
          files={files}
          onFilesChange={setFiles}
        />
      </TableCell>
      
      <TableCell className="py-2 w-20">
        <DeleteButton
          onDelete={() => onDelete(issue.id)}
          title="Delete Issue"
          description={`Are you sure you want to delete the issue "${issue.title}"? This action cannot be undone.`}
          size="sm"
          variant="ghost"
          isLoading={isDeleting}
          showIcon={true}
          className="h-8"
        />
      </TableCell>
    </TableRow>
  );
}