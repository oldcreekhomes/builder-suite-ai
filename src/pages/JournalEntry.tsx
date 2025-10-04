import { DashboardHeader } from "@/components/DashboardHeader";
import { CompanyDashboardHeader } from "@/components/CompanyDashboardHeader";
import { AppSidebar } from "@/components/AppSidebar";
import { useParams } from "react-router-dom";
import { JournalEntryForm } from "@/components/journal/JournalEntryForm";

export default function JournalEntry() {
  const { projectId } = useParams();
  
  return (
    <div className="min-h-screen flex w-full bg-gray-50">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        {projectId ? (
          <DashboardHeader projectId={projectId} />
        ) : (
          <CompanyDashboardHeader title=" " />
        )}
        
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto p-6 space-y-6">
            <div>
              <h1 className="text-3xl font-bold">Journal Entry</h1>
              <p className="text-muted-foreground mt-2">
                Create and manage journal entries for {projectId ? 'this project' : 'company overhead'}
              </p>
            </div>

            <JournalEntryForm projectId={projectId} />
          </div>
        </main>
      </div>
    </div>
  );
}
