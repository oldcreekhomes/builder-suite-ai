import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Plus, ArrowLeft } from "lucide-react";
import { useState } from "react";
import { NewProjectDialog } from "@/components/NewProjectDialog";
import { useUserProfile } from "@/hooks/useUserProfile";

interface DashboardHeaderProps {
  title?: string;
}

export function DashboardHeader({ title }: DashboardHeaderProps) {
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const { profile } = useUserProfile();

  // Get company name - handle both home builders and employees
  const getCompanyName = () => {
    if (profile && 'company_name' in profile && profile.company_name) {
      // User is a home builder
      return profile.company_name;
    } else if (profile && 'home_builder_id' in profile && profile.home_builder_id) {
      // User is an employee - we'd need to fetch the home builder's company name
      // For now, use a generic fallback
      return "Company Dashboard";
    }
    return "Company";
  };
  
  const companyName = getCompanyName();
  
  // Use provided title or fallback to company name
  const displayTitle = title || companyName;

  return (
    <>
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <SidebarTrigger className="text-gray-600 hover:text-black h-8 w-8 flex items-center justify-center">
              <ArrowLeft className="h-4 w-4" />
            </SidebarTrigger>
            <div>
              <h1 className="text-2xl font-bold text-black">{displayTitle}</h1>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button 
              className="bg-black hover:bg-gray-800 text-white"
              onClick={() => setIsNewProjectOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
          </div>
        </div>
      </header>

      <NewProjectDialog 
        open={isNewProjectOpen} 
        onOpenChange={setIsNewProjectOpen} 
      />
    </>
  );
}
