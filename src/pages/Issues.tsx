import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IssuesTable } from "@/components/issues/IssuesTable";
import { useIssueCounts } from "@/hooks/useIssueCounts";
import { UniversalFilePreviewProvider } from "@/components/files/UniversalFilePreviewProvider";

const Issues = () => {
  const { data: issueCounts = {} } = useIssueCounts();

  const categories = [
    "Accounting",
    "Authentication",
    "Bidding",
    "Budget",
    "Companies",
    "Files",
    "Messages",
    "Orders",
    "Photos",
    "Schedule",
    "Settings"
  ];

  const defaultCategory = "Accounting";

  return (
    <SidebarProvider>
      <UniversalFilePreviewProvider>
        <div className="min-h-screen flex w-full">
          <AppSidebar />
          <SidebarInset className="flex-1">
            <DashboardHeader title="Software Issues" />
            
            <div className="flex-1 p-4 md:p-8 pt-6">
              <Tabs defaultValue={defaultCategory} orientation="vertical" className="flex gap-8">
                {/* Left sidebar - category navigation */}
                <div className="w-52 shrink-0">
                  <h1 className="text-2xl font-bold text-foreground mb-6">Software Issues</h1>
                  <TabsList className="flex flex-col h-auto w-full bg-transparent p-0 gap-1">
                    {categories.map((category) => (
                      <TabsTrigger 
                        key={category} 
                        value={category} 
                        className="justify-start w-full px-3 py-2.5 border-l-2 border-transparent data-[state=active]:border-l-primary data-[state=active]:bg-muted rounded-none text-sm font-medium text-muted-foreground data-[state=active]:text-foreground hover:bg-muted/50"
                      >
                        <span className="flex-1 text-left">{category}</span>
                        <div className="flex gap-1">
                          {issueCounts[category]?.normal > 0 && (
                            <span className="bg-black text-white rounded-full min-w-5 h-5 flex items-center justify-center text-xs font-medium">
                              {issueCounts[category].normal}
                            </span>
                          )}
                          {issueCounts[category]?.high > 0 && (
                            <span className="bg-red-500 text-white rounded-full min-w-5 h-5 flex items-center justify-center text-xs font-medium">
                              {issueCounts[category].high}
                            </span>
                          )}
                        </div>
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </div>
                
                {/* Main content area */}
                <div className="flex-1 min-w-0">
                  {categories.map((category) => (
                    <TabsContent key={category} value={category} className="mt-0">
                      <IssuesTable category={category} />
                    </TabsContent>
                  ))}
                </div>
              </Tabs>
            </div>
          </SidebarInset>
        </div>
      </UniversalFilePreviewProvider>
    </SidebarProvider>
  );
};

export default Issues;
