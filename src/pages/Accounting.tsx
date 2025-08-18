import React, { useState, useEffect } from 'react';
import { CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import { CompanyDashboardHeader } from "@/components/CompanyDashboardHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";

export default function Accounting() {
  const [selectedApprover, setSelectedApprover] = useState('Sarah Wilson');
  const [jobApprovals, setJobApprovals] = useState<Record<string, boolean>>({});

  // Load approvals from localStorage on mount
  useEffect(() => {
    const savedApprovals = localStorage.getItem('accountingJobApprovals');
    if (savedApprovals) {
      setJobApprovals(JSON.parse(savedApprovals));
    }
  }, []);

  // Save approvals to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('accountingJobApprovals', JSON.stringify(jobApprovals));
  }, [jobApprovals]);

  const approvers = [
    { id: 1, name: 'Sarah Wilson', initial: 'SW' },
    { id: 2, name: 'Mike Johnson', initial: 'MJ' },
    { id: 3, name: 'Lisa Chen', initial: 'LC' }
  ];

  const jobs = [
    { id: 'JOB-001', name: 'Riverside Residence', approver: 'Sarah Wilson', pending: 2, approved: 1, status: 'pending' },
    { id: 'JOB-002', name: 'Downtown Office Complex', approver: 'Mike Johnson', pending: 0, approved: 3, status: 'approved' },
    { id: 'JOB-003', name: 'Maple Street Duplex', approver: 'Lisa Chen', pending: 1, approved: 0, status: 'pending' },
    { id: 'JOB-004', name: 'Sunset Villa', approver: 'Sarah Wilson', pending: 0, approved: 2, status: 'approved' },
    { id: 'JOB-005', name: 'Pine Grove Townhomes', approver: 'Mike Johnson', pending: 0, approved: 0, status: 'current' },
    { id: 'JOB-006', name: 'Lakefront Cabin', approver: 'Lisa Chen', pending: 1, approved: 0, status: 'pending' },
    { id: 'JOB-007', name: 'Industrial Warehouse', approver: 'Sarah Wilson', pending: 0, approved: 4, status: 'approved' },
    { id: 'JOB-008', name: 'Greenfield Apartments', approver: 'Mike Johnson', pending: 3, approved: 1, status: 'pending' },
    { id: 'JOB-009', name: 'Oak Street Renovation', approver: 'Lisa Chen', pending: 0, approved: 0, status: 'current' },
    { id: 'JOB-010', name: 'Tech Campus Phase 1', approver: 'Sarah Wilson', pending: 2, approved: 2, status: 'pending' },
    { id: 'JOB-011', name: 'Retail Plaza', approver: 'Mike Johnson', pending: 0, approved: 1, status: 'approved' },
    { id: 'JOB-012', name: 'Mountain View Condos', approver: 'Lisa Chen', pending: 1, approved: 0, status: 'pending' },
    { id: 'JOB-013', name: 'Community Center', approver: 'Sarah Wilson', pending: 0, approved: 3, status: 'approved' },
    { id: 'JOB-014', name: 'Luxury Hotel', approver: 'Mike Johnson', pending: 4, approved: 1, status: 'pending' },
    { id: 'JOB-015', name: 'School Addition', approver: 'Lisa Chen', pending: 0, approved: 0, status: 'current' },
    { id: 'JOB-016', name: 'Medical Building', approver: 'Sarah Wilson', pending: 1, approved: 2, status: 'pending' },
    { id: 'JOB-017', name: 'Sports Complex', approver: 'Mike Johnson', pending: 0, approved: 2, status: 'approved' },
    { id: 'JOB-018', name: 'Senior Housing', approver: 'Lisa Chen', pending: 2, approved: 0, status: 'pending' },
    { id: 'JOB-019', name: 'Transit Station', approver: 'Sarah Wilson', pending: 0, approved: 1, status: 'approved' },
    { id: 'JOB-020', name: 'Fire Station', approver: 'Mike Johnson', pending: 0, approved: 0, status: 'current' }
  ];

  const handleApprovalChange = (jobId: string, isApproved: boolean) => {
    setJobApprovals(prev => ({
      ...prev,
      [jobId]: isApproved
    }));
  };

  const isJobApproved = (jobId: string) => {
    return jobApprovals[jobId] || false;
  };

  const filteredJobs = jobs.filter(job => job.approver === selectedApprover);

  const summaryStats = {
    totalApproved: filteredJobs.filter(job => isJobApproved(job.id)).length,
    totalUnapproved: filteredJobs.filter(job => !isJobApproved(job.id)).length,
    totalJobs: filteredJobs.length
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex-1 flex flex-col">
          <CompanyDashboardHeader title="My Invoice Dashboard" />
          <div className="flex-1 p-6 space-y-6">
            {/* Summary KPIs */}
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-foreground">{summaryStats.totalJobs}</div>
                  <div className="text-sm text-muted-foreground">Total Jobs</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-foreground">{summaryStats.totalUnapproved}</div>
                  <div className="text-sm text-muted-foreground">Unapproved</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-foreground">{summaryStats.totalApproved}</div>
                  <div className="text-sm text-muted-foreground">Approved</div>
                </CardContent>
              </Card>
            </div>

            {/* Jobs Table with Approver Tabs */}
            <Card>
              <Tabs value={selectedApprover} onValueChange={setSelectedApprover} className="w-full">
                <div className="p-4 border-b">
                  <TabsList className="grid w-full grid-cols-3">
                    {approvers.map((approver) => (
                      <TabsTrigger 
                        key={approver.id} 
                        value={approver.name}
                        className="flex items-center gap-2"
                      >
                        <div className="w-3 h-3 rounded-full bg-primary"></div>
                        {approver.name}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </div>
                
                {approvers.map((approver) => (
                  <TabsContent key={approver.id} value={approver.name} className="m-0">
                    <div className="p-4 border-b bg-muted/30">
                      <h3 className="text-lg font-semibold text-foreground">{approver.name}'s Jobs</h3>
                    </div>
                    
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-left">Job Name</TableHead>
                          <TableHead className="text-center">Approved</TableHead>
                          <TableHead className="text-center">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredJobs.map((job) => {
                          const approved = isJobApproved(job.id);
                          return (
                            <TableRow 
                              key={job.id} 
                              className={`hover:bg-muted/50 ${approved ? 'border-l-4 border-l-primary' : 'border-l-4 border-l-muted'}`}
                            >
                              <TableCell className="font-medium text-foreground">{job.name}</TableCell>
                              <TableCell className="text-center">
                                <Checkbox
                                  checked={approved}
                                  onCheckedChange={(checked) => handleApprovalChange(job.id, checked as boolean)}
                                  className="w-4 h-4"
                                />
                              </TableCell>
                              <TableCell className="text-center">
                                <span className="text-sm font-medium text-foreground">
                                  {approved ? 'Approved' : 'Unapproved'}
                                </span>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TabsContent>
                ))}
              </Tabs>
            </Card>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}