import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useProjects } from "@/hooks/useProjects";
import { useProjectScheduleProgress } from "@/hooks/useProjectScheduleProgress";
import { useBillCountsByProject } from "@/hooks/useBillCountsByProject";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

const statusColors: Record<string, string> = {
  "In Design": "bg-yellow-500/20 text-yellow-700 border-yellow-500/30",
  "Permitting": "bg-blue-500/20 text-blue-700 border-blue-500/30",
  "Under Construction": "bg-orange-500/20 text-orange-700 border-orange-500/30",
  "Completed": "bg-green-500/20 text-green-700 border-green-500/30",
};

const statusPriority: Record<string, number> = {
  "Under Construction": 1,
  "Permitting": 2,
  "In Design": 3,
};

export function ActiveJobsTable() {
  const navigate = useNavigate();
  const { data: projects = [] } = useProjects();
  const [sortColumn, setSortColumn] = useState<'address' | 'status'>('status');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // Filter to active projects only (not completed)
  const activeProjects = projects.filter(p => p.status !== "Completed");
  const projectIds = activeProjects.map(p => p.id);
  
  // Sort projects
  const sortedProjects = [...activeProjects].sort((a, b) => {
    if (sortColumn === 'status') {
      const priorityA = statusPriority[a.status || "In Design"] || 4;
      const priorityB = statusPriority[b.status || "In Design"] || 4;
      return sortDirection === 'asc' ? priorityA - priorityB : priorityB - priorityA;
    } else {
      const addressA = (a.address || "").toLowerCase();
      const addressB = (b.address || "").toLowerCase();
      return sortDirection === 'asc' 
        ? addressA.localeCompare(addressB) 
        : addressB.localeCompare(addressA);
    }
  });

  const handleSort = (column: 'address' | 'status') => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (column: 'address' | 'status') => {
    if (sortColumn !== column) return <ArrowUpDown className="h-4 w-4 ml-1" />;
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-4 w-4 ml-1" /> 
      : <ArrowDown className="h-4 w-4 ml-1" />;
  };

  const { data: scheduleProgress = {} } = useProjectScheduleProgress(projectIds);
  const { data: billCounts = {} } = useBillCountsByProject(projectIds);

  const handleRowClick = (projectId: string) => {
    navigate(`/project/${projectId}`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Active Jobs</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50 select-none"
                onClick={() => handleSort('address')}
              >
                <div className="flex items-center">
                  Address
                  {getSortIcon('address')}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50 select-none"
                onClick={() => handleSort('status')}
              >
                <div className="flex items-center">
                  Status
                  {getSortIcon('status')}
                </div>
              </TableHead>
              <TableHead>Schedule Progress</TableHead>
              <TableHead className="text-center">Review</TableHead>
              <TableHead className="text-center">Pay</TableHead>
              <TableHead>Next Milestone</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activeProjects.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No active projects
                </TableCell>
              </TableRow>
            ) : (
              sortedProjects.map((project) => {
                const progress = scheduleProgress[project.id];
                const bills = billCounts[project.id];
                
                return (
                  <TableRow
                    key={project.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleRowClick(project.id)}
                  >
                    <TableCell className="font-medium">
                      {project.address || "No address"}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={statusColors[project.status || "In Design"]}
                      >
                        {project.status || "In Design"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 min-w-[120px]">
                        <Progress 
                          value={progress?.overallProgress || 0} 
                          className="h-2 flex-1"
                        />
                        <span className="text-sm text-muted-foreground w-10">
                          {progress?.overallProgress || 0}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {bills?.reviewCount ? (
                        <Badge variant="secondary">{bills.reviewCount}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {bills?.payCount ? (
                        <Badge variant="secondary">{bills.payCount}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {progress?.nextMilestone || "-"}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
