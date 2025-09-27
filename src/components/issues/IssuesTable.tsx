import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { IssuesTableHeader } from './IssuesTableHeader';
import { IssuesTableRow } from './IssuesTableRow';
import { AddIssueRow } from './AddIssueRow';
import { useCompanyIssues } from '@/hooks/useCompanyIssues';
import { useIssueMutations } from '@/hooks/useIssueMutations';

interface IssuesTableProps {
  category: string;
}

export function IssuesTable({ category }: IssuesTableProps) {
  const [showAddRow, setShowAddRow] = useState(false);
  const { data: issues, isLoading } = useCompanyIssues(category);
  const { updateIssue, updateIssueStatus, deleteIssue } = useIssueMutations();

  const handleUpdateIssue = (id: string, updates: { 
    title?: string; 
    priority?: 'Normal' | 'High';
    solution?: string;
    solution_files?: string[];
  }) => {
    updateIssue.mutate({ id, ...updates });
  };

  const handleDeleteIssue = (id: string) => {
    deleteIssue.mutate(id);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button onClick={() => setShowAddRow(true)} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Add Issue
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <IssuesTableHeader />
          <TableBody>
            {showAddRow && (
              <AddIssueRow 
                category={category}
                onCancel={() => setShowAddRow(false)}
                onSuccess={() => setShowAddRow(false)}
              />
            )}
            
            {(!issues || issues.length === 0) && !showAddRow ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-4 text-xs text-muted-foreground">
                  No {category.toLowerCase()} issues found.
                  <br />
                  <span className="text-xs">Click "Add Issue" to create the first one.</span>
                </TableCell>
              </TableRow>
            ) : (
              issues?.map((issue, index) => (
                <IssuesTableRow
                  key={issue.id}
                  issue={issue}
                  issueNumber={index + 1}
                  onUpdate={handleUpdateIssue}
                  onDelete={handleDeleteIssue}
                  isDeleting={deleteIssue.isPending}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}