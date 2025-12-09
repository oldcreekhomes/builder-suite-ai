import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useState } from "react";
import { NewProjectDialog } from "@/components/NewProjectDialog";
import { useUserProfile } from "@/hooks/useUserProfile";
import { DashboardSelector } from "@/components/DashboardSelector";

interface CompanyDashboardHeaderProps {
  title?: string;
  dashboardView?: "project-manager" | "owner";
  onDashboardViewChange?: (value: "project-manager" | "owner") => void;
}

export function CompanyDashboardHeader({ 
  title, 
  dashboardView, 
  onDashboardViewChange 
}: CompanyDashboardHeaderProps) {
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const { profile } = useUserProfile();

  // Get company name - handle both home builders and employees
  const getCompanyName = () => {
    if (profile && 'company_name' in profile && profile.company_name) {
      return profile.company_name;
    } else if (profile && 'home_builder_id' in profile && profile.home_builder_id) {
      return "Company Dashboard";
    }
    return "Company";
  };
  
  const companyName = getCompanyName();
  const displayTitle = title || companyName;

  return (
    <>
      <header className="bg-white border-b border-border px-6 py-2 mt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <SidebarTrigger className="text-gray-600 hover:text-black" />
            <h1 className="text-2xl font-bold text-black">{displayTitle}</h1>
            {dashboardView && onDashboardViewChange && (
              <DashboardSelector value={dashboardView} onChange={onDashboardViewChange} />
            )}
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