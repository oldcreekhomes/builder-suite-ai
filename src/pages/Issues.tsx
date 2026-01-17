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
          <SidebarInset className="flex-1 flex flex-col">
            <DashboardHeader title="Software Issues" />
            
            <div className="flex-1 flex">
              <Tabs defaultValue={defaultCategory} orientation="vertical" className="flex w-full">
                {/* Left sidebar - category navigation */}
                <div className="w-52 shrink-0 border-r border-border bg-background min-h-full flex flex-col">
                  {/* Title section with padding */}
                  <div className="p-4 pb-0">
                    <h1 className="text-2xl font-bold text-foreground">Software Issues</h1>
                  </div>
                  
                  {/* Full-width horizontal separator below title */}
                  <div className="border-b border-border mt-[21px] mb-4" />
                  
                  {/* Menu section - full width for highlights */}
                  <div className="flex-1">
                    <TabsList className="flex flex-col h-auto w-full bg-transparent p-0 gap-1">
                      {categories.map((category) => (
                        <TabsTrigger 
                          key={category} 
                          value={category} 
                          className="justify-start w-full pl-4 pr-4 py-2.5 border-l-2 border-transparent data-[state=active]:border-l-primary data-[state=active]:bg-muted rounded-none text-sm font-medium text-muted-foreground data-[state=active]:text-foreground hover:bg-muted/50"
                        >
                          <span className="flex-1 text-left">{category}</span>
                          <div className="flex flex-col items-end gap-0.5">
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
                    
                    {/* Full-width horizontal separator at bottom */}
                    <div className="border-b border-border mt-4" />
                  </div>
                </div>
                
                {/* Main content area */}
                <div className="flex-1 min-w-0 p-6">
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
