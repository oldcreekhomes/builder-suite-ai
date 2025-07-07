
import { useLocation } from "react-router-dom";
import { 
  DollarSign, 
  FileText, 
  Home, 
  File,
  Image,
  Clock,
  HelpCircle,
  MessageSquare
} from "lucide-react";
import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const navigationItems = [
  {
    title: "Company Dashboard",
    url: "/",
    icon: Home,
  },
  {
    title: "Messages",
    url: "/messages",
    icon: MessageSquare,
  },
  {
    title: "Files",
    url: "/files",
    icon: File,
  },
  {
    title: "Photos",
    url: "/photos", 
    icon: Image,
  },
  {
    title: "Budget",
    url: "/budget",
    icon: DollarSign,
  },
  {
    title: "Bidding",
    url: "/bidding",
    icon: FileText,
  },
  {
    title: "Schedule",
    icon: Clock,
    comingSoon: true,
  },
];

export function SidebarNavigation() {
  const location = useLocation();

  // Get current project ID from URL
  const getProjectId = () => {
    const pathParts = location.pathname.split('/');
    if (pathParts[1] === 'project' && pathParts[2]) {
      return pathParts[2]; // /project/{id}
    }
    return null;
  };

  const projectId = getProjectId();

  // Check if we're on the Company Dashboard or Messages page
  const isCompanyDashboard = location.pathname === '/';
  const isMessagesPage = location.pathname === '/messages';
  
  // Filter navigation items based on current route
  const filteredItems = isCompanyDashboard 
    ? navigationItems.filter(item => item.title === "Messages")
    : isMessagesPage
      ? [] // No navigation items on messages page
      : projectId 
        ? navigationItems 
        : [];

  // Don't show navigation items if no project is selected and not on dashboard or messages
  if (!projectId && !isCompanyDashboard && !isMessagesPage) {
    return (
      <SidebarContent className="px-3 py-4">
        <SidebarGroup>
          <SidebarGroupContent>
            <div className="text-center py-8">
              <p className="text-sm text-gray-500">Select a project to see navigation options</p>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    );
  }
  
  // On messages page, don't show any navigation items - the page handles its own sidebar content
  if (isMessagesPage) {
    return null;
  }

  return (
    <TooltipProvider>
      <SidebarContent className="px-3 py-4">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  {item.comingSoon ? (
                    <div className="flex items-center w-full space-x-3 p-3 rounded-lg text-gray-700 cursor-not-allowed">
                      <item.icon className="h-5 w-5" />
                      <span className="font-medium flex-1">{item.title}</span>
                      <Tooltip>
                        <TooltipTrigger>
                          <HelpCircle className="h-4 w-4" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Coming Soon</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  ) : (
                    <SidebarMenuButton 
                      asChild 
                      className="w-full justify-start hover:bg-gray-100 text-gray-700 hover:text-black transition-colors"
                    >
                      <a href={item.url === '/' ? '/' : `/project/${projectId}${item.url}`} className="flex items-center space-x-3 p-3 rounded-lg">
                        <item.icon className="h-5 w-5" />
                        <span className="font-medium">{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </TooltipProvider>
  );
}
