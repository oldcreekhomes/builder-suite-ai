
import { useLocation } from "react-router-dom";

import { 
  DollarSign, 
  FileText, 
  Home, 
  File,
  Image,
  Clock,
  MessageSquare,
  HelpCircle
} from "lucide-react";
import { UnreadBadge } from "@/components/ui/unread-badge";
import { useCompanyUsers } from "@/hooks/useCompanyUsers";
import { useUnreadCounts } from "@/hooks/useUnreadCounts";
import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";


const navigationItems = [
  {
    title: "Company Dashboard",
    url: "/",
    icon: Home,
    enabled: true,
  },
  {
    title: "Messages",
    url: "/messages",
    icon: MessageSquare,
    enabled: true,
    showBadge: true,
  },
  {
    title: "Files",
    url: "/files",
    icon: File,
    enabled: true,
  },
  {
    title: "Photos",
    url: "/photos", 
    icon: Image,
    enabled: true,
  },
  {
    title: "Budget",
    url: "/budget",
    icon: DollarSign,
    enabled: true,
  },
  {
    title: "Bidding",
    url: "/bidding",
    icon: FileText,
    enabled: true,
  },
  {
    title: "Schedule",
    url: "/schedule",
    icon: Clock,
    enabled: true,
  },
];

export function SidebarNavigation() {
  const location = useLocation();
  const { users } = useCompanyUsers();
  const userIds = users?.map(user => user.id) || [];
  const { unreadCounts } = useUnreadCounts(userIds);
  
  // Calculate total unread count
  const totalUnread = Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);

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
  const isMessagesPage = location.pathname === '/messages' || location.pathname.includes('/messages');
  
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
                    <SidebarMenuButton 
                      asChild 
                      className="w-full justify-start hover:bg-gray-100 text-gray-700 hover:text-black transition-colors"
                    >
                        <a href={item.url === '/' ? '/' : `/project/${projectId}${item.url}`} className="flex items-center space-x-3 p-3 rounded-lg w-full">
                          <item.icon className="h-5 w-5" />
                          <span className="font-medium">{item.title}</span>
                          {item.showBadge && (
                            <div className="ml-auto flex items-center">
                              <UnreadBadge count={totalUnread} className="relative top-0" />
                            </div>
                          )}
                        </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
               ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </TooltipProvider>
  );
  }
