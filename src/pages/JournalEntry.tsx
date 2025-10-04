import { DashboardHeader } from "@/components/DashboardHeader";
import { CompanyDashboardHeader } from "@/components/CompanyDashboardHeader";
import { AppSidebar } from "@/components/AppSidebar";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function JournalEntry() {
  const { projectId } = useParams();
  
  return (
    <div className="min-h-screen flex w-full bg-gray-50">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        {projectId ? (
          <DashboardHeader projectId={projectId} />
        ) : (
          <CompanyDashboardHeader />
        )}
        
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto p-6 space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Journal Entry</h1>
              <p className="text-gray-600 mt-2">
                Create and manage journal entries for {projectId ? 'this project' : 'company overhead'}
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Journal Entries</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-gray-500">
                  Journal entry functionality coming soon
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
