import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProjectManagerDashboard } from "./ProjectManagerDashboard";
import { AccountantDashboard } from "./AccountantDashboard";
import { LayoutDashboard, Calculator } from "lucide-react";

const DASHBOARD_TAB_KEY = 'selected-dashboard-tab';

export function DashboardTabs() {
  const [activeTab, setActiveTab] = useState<string>(() => {
    return localStorage.getItem(DASHBOARD_TAB_KEY) || 'project_manager';
  });

  useEffect(() => {
    localStorage.setItem(DASHBOARD_TAB_KEY, activeTab);
  }, [activeTab]);

  return (
    <div className="flex flex-1 flex-col">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-1 flex-col">
        <div className="border-b px-6 py-2">
          <TabsList className="h-10">
            <TabsTrigger value="project_manager" className="flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4" />
              Project Manager
            </TabsTrigger>
            <TabsTrigger value="accountant" className="flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Accountant
            </TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="project_manager" className="flex-1 mt-0">
          <ProjectManagerDashboard />
        </TabsContent>
        
        <TabsContent value="accountant" className="flex-1 mt-0">
          <AccountantDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
