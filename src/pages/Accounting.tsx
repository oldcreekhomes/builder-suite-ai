import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import { CompanyDashboardHeader } from "@/components/CompanyDashboardHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, DollarSign, Clock, CheckCircle } from "lucide-react";

export default function Accounting() {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex-1 flex flex-col">
          <CompanyDashboardHeader title="Accounting Dashboard" />
          <div className="flex-1 p-6 space-y-6">
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Bills</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">12</div>
                  <p className="text-xs text-muted-foreground">
                    Bills awaiting approval
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">$24,532</div>
                  <p className="text-xs text-muted-foreground">
                    Pending payments
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Overdue</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">3</div>
                  <p className="text-xs text-muted-foreground">
                    Bills past due date
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Approved This Month</CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">45</div>
                  <p className="text-xs text-muted-foreground">
                    Bills processed
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>
                  Common accounting tasks and workflows
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                  <h3 className="font-medium mb-2">Review Pending Bills</h3>
                  <p className="text-sm text-muted-foreground">
                    View and approve bills awaiting authorization
                  </p>
                </div>
                <div className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                  <h3 className="font-medium mb-2">Enter New Bills</h3>
                  <p className="text-sm text-muted-foreground">
                    Add new bills to the system for processing
                  </p>
                </div>
                <div className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                  <h3 className="font-medium mb-2">Payment Reports</h3>
                  <p className="text-sm text-muted-foreground">
                    Generate reports for accounting periods
                  </p>
                </div>
                <div className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                  <h3 className="font-medium mb-2">Vendor Management</h3>
                  <p className="text-sm text-muted-foreground">
                    Manage vendor information and payment terms
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>
                  Latest accounting transactions and approvals
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-4 p-3 bg-muted/50 rounded-lg">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Bill #1234 approved</p>
                      <p className="text-xs text-muted-foreground">ABC Supply - $1,250.00</p>
                    </div>
                    <p className="text-xs text-muted-foreground">2 hours ago</p>
                  </div>
                  
                  <div className="flex items-center space-x-4 p-3 bg-muted/50 rounded-lg">
                    <FileText className="h-4 w-4 text-blue-600" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">New bill submitted</p>
                      <p className="text-xs text-muted-foreground">XYZ Materials - $3,750.00</p>
                    </div>
                    <p className="text-xs text-muted-foreground">4 hours ago</p>
                  </div>
                  
                  <div className="flex items-center space-x-4 p-3 bg-muted/50 rounded-lg">
                    <Clock className="h-4 w-4 text-orange-600" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Payment reminder</p>
                      <p className="text-xs text-muted-foreground">DEF Services - Due in 2 days</p>
                    </div>
                    <p className="text-xs text-muted-foreground">1 day ago</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}