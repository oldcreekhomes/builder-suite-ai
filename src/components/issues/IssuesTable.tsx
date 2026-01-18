import React, { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search } from 'lucide-react';
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
  const [searchQuery, setSearchQuery] = useState('');
  const { data: issues, isLoading } = useCompanyIssues(category);
  const { updateIssue, updateIssueStatus, resolveIssue } = useIssueMutations();

  const handleUpdateIssue = (id: string, updates: { 
    title?: string; 
    priority?: 'Normal' | 'High';
    solution?: string;
    solution_files?: string[];
    location?: string;
    category?: string;
  }) => {
    updateIssue.mutate({ id, ...updates });
  };

  const handleResolveIssue = (id: string, ccUserIds: string[]) => {
    resolveIssue.mutate({ id, ccUserIds });
  };

  const filteredIssues = useMemo(() => {
    if (!issues) return [];
    if (!searchQuery.trim()) return issues;
    
    const query = searchQuery.toLowerCase();
    return issues.filter(issue => 
      issue.title.toLowerCase().includes(query) ||
      issue.solution?.toLowerCase().includes(query) ||
      issue.location?.toLowerCase().includes(query)
    );
  }, [issues, searchQuery]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header section */}
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-semibold text-foreground">{category}</h3>
          <p className="text-sm text-muted-foreground">Report issues in the {category} module</p>
        </div>
        <Button onClick={() => setShowAddRow(true)} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Add Issue
        </Button>
      </div>

      {/* Search bar */}
      <div className="relative w-64">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
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
            
            {(!filteredIssues || filteredIssues.length === 0) && !showAddRow ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-4 text-xs text-muted-foreground">
                  {searchQuery ? (
                    <>No issues matching "{searchQuery}" found.</>
                  ) : (
                    <>
                      No {category.toLowerCase()} issues found.
                      <br />
                      <span className="text-xs">Click "Add Issue" to create the first one.</span>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              filteredIssues?.map((issue, index) => (
                <IssuesTableRow
                  key={issue.id}
                  issue={issue}
                  issueNumber={index + 1}
                  onUpdate={handleUpdateIssue}
                  onResolve={handleResolveIssue}
                  isResolving={resolveIssue.isPending}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
