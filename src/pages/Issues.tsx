import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IssuesList } from "@/components/issues/IssuesList";
import { useBrowserTitle } from "@/hooks/useBrowserTitle";
import { useIssueCounts } from "@/hooks/useIssueCounts";
import { useFloatingChat } from "@/components/chat/FloatingChatManager";

const Issues = () => {
  useBrowserTitle();
  const { data: issueCounts = {} } = useIssueCounts();
  const { openFloatingChat } = useFloatingChat();

  const categories = [
    "Messages",
    "Files", 
    "Photos",
    "Budget",
    "Bidding",
    "Schedule",
    "Authentication"
  ];

  // Filter categories to only show those with issues
  const categoriesWithIssues = categories.filter(category => {
    const categoryCount = issueCounts[category];
    return categoryCount && (categoryCount.normal > 0 || categoryCount.high > 0);
  });

  // Use the first category with issues as default, or fallback to "Messages"
  const defaultCategory = categoriesWithIssues.length > 0 ? categoriesWithIssues[0] : "Messages";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar onStartChat={openFloatingChat} />
        <SidebarInset className="flex-1">
          <DashboardHeader title="Software Issues" />
          
          <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <Tabs defaultValue={defaultCategory} className="w-full">
              <TabsList className={`grid w-full ${categoriesWithIssues.length <= 3 ? 'grid-cols-3' : categoriesWithIssues.length <= 4 ? 'grid-cols-4' : categoriesWithIssues.length <= 5 ? 'grid-cols-5' : categoriesWithIssues.length <= 6 ? 'grid-cols-6' : 'grid-cols-7'}`}>
                {categoriesWithIssues.map((category) => (
                  <TabsTrigger key={category} value={category} className="relative">
                    <span>{category}</span>
                    <div className="ml-2 flex gap-1">
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
              
              {categoriesWithIssues.map((category) => (
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