import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IssuesList } from "@/components/issues/IssuesList";
import { useBrowserTitle } from "@/hooks/useBrowserTitle";

const Issues = () => {
  useBrowserTitle();

  const categories = [
    "Messages",
    "Files", 
    "Photos",
    "Budget",
    "Bidding",
    "Schedule"
  ];

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <SidebarInset className="flex-1">
          <DashboardHeader title="Company Issues" />
          
          <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <Tabs defaultValue="Messages" className="w-full">
              <TabsList className="grid w-full grid-cols-6">
                {categories.map((category) => (
                  <TabsTrigger key={category} value={category}>
                    {category}
                  </TabsTrigger>
                ))}
              </TabsList>
              
              {categories.map((category) => (
                <TabsContent key={category} value={category} className="space-y-4">
                  <IssuesList category={category} />
                </TabsContent>
              ))}
            </Tabs>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Issues;