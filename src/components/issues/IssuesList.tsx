import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { AddIssueDialog } from "./AddIssueDialog";
import { IssueCard } from "./IssueCard";
import { useCompanyIssues } from "@/hooks/useCompanyIssues";

interface IssuesListProps {
  category: string;
}

export function IssuesList({ category }: IssuesListProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const { data: issues, isLoading } = useCompanyIssues(category);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">{category} Issues</h3>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Issue
        </Button>
      </div>

      {issues && issues.length > 0 ? (
        <div className="space-y-3">
          {issues.map((issue, index) => (
            <IssueCard 
              key={issue.id} 
              issue={issue} 
              issueNumber={index + 1}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <p>No {category.toLowerCase()} issues found.</p>
          <p className="text-sm mt-2">Click "Add Issue" to create the first one.</p>
        </div>
      )}

      <AddIssueDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        category={category}
      />
    </div>
  );
}