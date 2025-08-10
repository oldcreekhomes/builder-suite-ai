import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Plus, ArrowLeft } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { NewProjectDialog } from "@/components/NewProjectDialog";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useProject } from "@/hooks/useProject";

interface DashboardHeaderProps {
  title?: string;
  projectId?: string;
}

export function DashboardHeader({ title, projectId }: DashboardHeaderProps) {
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const { profile } = useUserProfile();
  const navigate = useNavigate();
  const { data: project, isLoading: projectLoading } = useProject(projectId || '');

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

  // If this is a project page, show project-specific header
  if (projectId) {
    return (
      <>
        <header className="bg-white border-b border-border px-6 py-2 mt-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <SidebarTrigger className="text-gray-600 hover:text-black" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/project/${projectId}`)}
                className="text-gray-600 hover:text-black"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Project
              </Button>
              <div className="flex items-center space-x-4">
                <h1 className="text-2xl font-bold text-black">{displayTitle}</h1>
                {project?.address && (
                  <p className="text-sm text-gray-600">{project.address}</p>
                )}
              </div>
            </div>
          </div>
        </header>
      </>
    );
  }

  // Default dashboard header
  return (
    <>
      <header className="bg-white border-b border-border px-6 py-2 mt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <SidebarTrigger className="text-gray-600 hover:text-black" />
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
