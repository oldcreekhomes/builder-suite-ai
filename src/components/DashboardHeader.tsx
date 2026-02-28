import { Button } from "@/components/ui/button";
import { Plus, ArrowLeft, ChevronsRight } from "lucide-react";
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { NewProjectDialog } from "@/components/NewProjectDialog";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useNotificationPreferences } from "@/hooks/useNotificationPreferences";
import { useProjectContextWithData } from "@/hooks/useProjectContext";
import { useSidebar } from "@/components/ui/sidebar";

interface DashboardHeaderProps {
  title?: string;
  subtitle?: string;
  projectId?: string;
  headerAction?: React.ReactNode;
}

export function DashboardHeader({ title, subtitle, projectId, headerAction }: DashboardHeaderProps) {
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const { profile } = useUserProfile();
  const { preferences } = useNotificationPreferences();
  const navigate = useNavigate();
  const location = useLocation();
  const { projectContext, goBackToProject, hasProjectContext } = useProjectContextWithData();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";

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

  // Check if we're on a global page (Settings, Companies, Employees)
  const isGlobalPage = location.pathname === '/settings' || 
                      location.pathname === '/companies' || 
                      location.pathname === '/employees';

  // Project page header with title/subtitle inside the bar
  if (projectId) {
    return (
      <header className="bg-white border-b border-border px-6 py-3.5">
        <div className="flex items-center h-10">
          {isCollapsed && (
            <Button variant="ghost" size="icon" onClick={toggleSidebar} className="h-8 w-8 mr-3">
              <ChevronsRight className="h-4 w-4" />
            </Button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-black">{title}</h1>
              {headerAction}
            </div>
            {subtitle && <p className="text-sm text-muted-foreground -mt-0.5">{subtitle}</p>}
          </div>
        </div>
      </header>
    );
  }

  // Default dashboard header with project context support
  return (
    <>
      <header className="bg-white border-b border-border px-6 py-3.5">
          <div className="flex items-center justify-between h-10">
            <div className="flex items-center space-x-4">
              {isCollapsed && (
                <Button variant="ghost" size="icon" onClick={toggleSidebar} className="h-8 w-8">
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              )}
              {/* Show "Back to Project" button on global pages when project context exists */}
              {isGlobalPage && hasProjectContext && projectContext && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={goBackToProject}
                  className="text-gray-600 hover:text-black"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to {projectContext.projectName}
                </Button>
              )}
              
              <div>
                <h1 className="text-xl font-bold text-black">{displayTitle}</h1>
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
