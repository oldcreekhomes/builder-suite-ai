import React, { useState, useEffect } from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { IssueFilesCell } from './IssueFilesCell';
import { SolutionFilesCell } from './SolutionFilesCell';
import { DeleteButton } from '@/components/ui/delete-button';
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
  onUpdate: (id: string, updates: { 
    title?: string; 
    priority?: 'Normal' | 'High';
    solution?: string;
    solution_files?: string[];
    location?: string;
  }) => void;
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

  // Fetch user data for author initials
  const { data: author } = useQuery({
    queryKey: ['user', issue.created_by],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('first_name, last_name')
        .eq('id', issue.created_by)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!issue.created_by,
  });

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

  const handleSolutionChange = (solution: string, solutionFiles: string[]) => {
    onUpdate(issue.id, { solution, solution_files: solutionFiles });
  };

  const getPriorityBadge = (priority: string) => {
    return priority === 'High' ? (
      <Badge variant="destructive" className="text-xs">High</Badge>
    ) : (
      <Badge variant="secondary" className="text-xs">Normal</Badge>
    );
  };

  const getAuthorInitials = () => {
    if (!author?.first_name || !author?.last_name) return '??';
    return `${author.first_name.charAt(0).toUpperCase()}.${author.last_name.charAt(0).toUpperCase()}.`;
  };

  return (
    <TableRow className="h-10">
      <TableCell className="px-2 py-1 text-xs font-medium w-12">
        {issueNumber}
      </TableCell>
      
      <TableCell className="px-2 py-1 text-xs w-20">
        {getAuthorInitials()}
      </TableCell>
      
      <TableCell className="px-2 py-1">
        {isEditingTitle ? (
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleBlur}
            onKeyDown={handleTitleKeyDown}
            className="h-6 text-xs"
            autoFocus
          />
        ) : (
          <div 
            className="min-h-6 px-1 text-xs cursor-pointer hover:bg-muted/50 rounded border border-transparent hover:border-border flex items-center break-words"
            onClick={() => setIsEditingTitle(true)}
            title={title}
          >
            {title}
          </div>
        )}
      </TableCell>
      
      <TableCell className="px-2 py-1 w-20">
        <Select value={issue.priority} onValueChange={handlePriorityChange}>
          <SelectTrigger className="h-auto w-full p-1 border-0 bg-transparent text-xs font-normal hover:bg-accent/50 rounded-sm transition-colors focus:ring-0 focus:outline-0 [&>svg]:hidden">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-background border-border shadow-lg z-50">
            <SelectItem value="Normal" className="text-xs hover:bg-accent">Normal</SelectItem>
            <SelectItem value="High" className="text-xs hover:bg-accent">High</SelectItem>
          </SelectContent>
        </Select>
      </TableCell>

      <IssueFilesCell 
        issueId={issue.id}
        files={files}
        onFilesChange={setFiles}
        isUploading={false}
        onFileUpload={async (uploadFiles) => {
          // Handle file upload logic here
          try {
            const uploadedFiles = [];
            for (const file of uploadFiles) {
              const fileExt = file.name.split('.').pop();
              const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
              const filePath = `${issue.id}/${fileName}`;

              const { error: uploadError } = await supabase.storage
                .from('issue-files')
                .upload(filePath, file);

              if (uploadError) throw uploadError;

              const { data: fileData, error: dbError } = await supabase
                .from('issue_files')
                .insert({
                  issue_id: issue.id,
                  file_name: file.name,
                  file_path: filePath,
                  file_size: file.size,
                  file_type: fileExt,
                })
                .select()
                .single();

              if (dbError) throw dbError;
              uploadedFiles.push(fileData);
            }
            setFiles([...files, ...uploadedFiles]);
          } catch (error) {
            console.error('Upload error:', error);
          }
        }}
        onFileDelete={async (fileId, filePath) => {
          try {
            const { error } = await supabase.storage
              .from('issue-files')
              .remove([filePath]);

            if (error) throw error;

            await supabase
              .from('issue_files')
              .delete()
              .eq('id', fileId);

            setFiles(files.filter(f => f.id !== fileId));
          } catch (error) {
            console.error('Delete error:', error);
          }
        }}
      />

      <TableCell className="px-2 py-1 w-24">
        <Select value={issue.location || ''} onValueChange={(value) => {
          // Handle location update here
          onUpdate(issue.id, { location: value });
        }}>
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

      <SolutionFilesCell
        issueId={issue.id}
        solution={issue.solution}
        solutionFiles={issue.solution_files}
        onSolutionChange={handleSolutionChange}
      />
      
      <TableCell className="px-2 py-1 w-16">
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(issue.id)}
            disabled={isDeleting}
            className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
            title="Delete issue"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}