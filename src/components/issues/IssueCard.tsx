import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, CheckCircle, Circle, AlertTriangle } from "lucide-react";
import { EditIssueDialog } from "./EditIssueDialog";
import { useIssueMutations } from "@/hooks/useIssueMutations";
import { CompanyIssue } from "@/hooks/useCompanyIssues";

interface IssueCardProps {
  issue: CompanyIssue;
  issueNumber: number;
}

export function IssueCard({ issue, issueNumber }: IssueCardProps) {
  const [showEditDialog, setShowEditDialog] = useState(false);
  const { updateIssueStatus } = useIssueMutations();

  const handleStatusToggle = () => {
    const newStatus = issue.status === 'Open' ? 'Resolved' : 'Open';
    updateIssueStatus.mutate({ id: issue.id, status: newStatus });
  };

  const getPriorityColor = (priority: string) => {
    return priority === 'High' ? 'destructive' : 'secondary';
  };

  const getStatusIcon = (status: string) => {
    return status === 'Resolved' ? CheckCircle : Circle;
  };

  const StatusIcon = getStatusIcon(issue.status);

  return (
    <Card className={`transition-colors ${issue.priority === 'High' ? 'border-l-4 border-l-red-500' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm text-muted-foreground">#{issueNumber}</span>
              {issue.priority === 'High' && (
                <AlertTriangle className="w-4 h-4 text-red-500" />
              )}
            </div>
            <h4 className="font-semibold text-lg">{issue.title}</h4>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={getPriorityColor(issue.priority)}>
              {issue.priority}
            </Badge>
            <Badge variant={issue.status === 'Resolved' ? 'default' : 'outline'}>
              {issue.status}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {issue.description && (
          <p className="text-muted-foreground mb-4">{issue.description}</p>
        )}
        
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Created {new Date(issue.created_at).toLocaleDateString()}
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleStatusToggle}
              className="flex items-center gap-2"
            >
              <StatusIcon className="w-4 h-4" />
              Mark as {issue.status === 'Open' ? 'Resolved' : 'Open'}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowEditDialog(true)}
            >
              <Edit className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>

      <EditIssueDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        issue={issue}
      />
    </Card>
  );
}