import { useLocation } from "react-router-dom";

import { 
  DollarSign, 
  FileText, 
  Home, 
  File,
  Image,
  MessageSquare,
  HelpCircle,
  Clock,
  AlertTriangle,
  ShoppingCart,
  Calculator
} from "lucide-react";
import { UnreadBadge } from "@/components/ui/unread-badge";
import { useCompanyUsers } from "@/hooks/useCompanyUsers";
import { UnreadCounts } from "@/hooks/useUnreadCounts";
import { useIssueCounts } from "@/hooks/useIssueCounts";
import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
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
    title: "Purchase Orders",
    url: "/purchase-orders",
    icon: ShoppingCart,
    enabled: true,
  },
  {
    title: "Schedule",
    url: "/schedule",
    icon: Clock,
    enabled: true,
  },
  {
    title: "Accounting",
    url: "/accounting",
    icon: Calculator,
    enabled: true,
  },
];

interface SidebarNavigationProps {
  unreadCounts: UnreadCounts;
}

export function SidebarNavigation({ unreadCounts }: SidebarNavigationProps) {
  const location = useLocation();
  const { users } = useCompanyUsers();
  // Removed useUnreadCounts hook call since it's now passed as props
  // const userIds = users?.map(user => user.id) || [];
  // const { unreadCounts } = useUnreadCounts(userIds);
  const { data: issueCounts } = useIssueCounts();
  
  // Calculate total unread count
  const totalUnread = Object.values(unreadCounts).reduce((sum: number, count: number) => sum + count, 0);

  // Calculate total issue counts
  const totalNormalIssues = Object.values(issueCounts || {}).reduce(
    (total, category) => total + category.normal,
    0
  );
  const totalHighIssues = Object.values(issueCounts || {}).reduce(
    (total, category) => total + category.high,
    0
  );
  const totalIssueCount = totalNormalIssues + totalHighIssues;

  // Get current project ID from URL
  const getProjectId = () => {
    const pathParts = location.pathname.split('/');
    if (pathParts[1] === 'project' && pathParts[2]) {
      return pathParts[2]; // /project/{id}
    }
    return null;
  };

  const projectId = getProjectId();

  // Check if we're on the Company Dashboard, Messages page, or Issues page
  const isCompanyDashboard = location.pathname === '/';
  const isMessagesPage = location.pathname === '/messages' || location.pathname.includes('/messages');
  const isIssuesPage = location.pathname === '/issues';
  
  // Create navigation items with dynamic URLs for project pages
  const getNavigationItems = () => {
    if (!projectId) return navigationItems;
    
    return navigationItems.map(item => {
      // Keep Company Dashboard as-is (not project-specific)
      if (item.title === "Company Dashboard") {
        return item;
      }
      
      // For project-specific items, prefix with project URL
      return {
        ...item,
        url: `/project/${projectId}${item.url}`
      };
    });
  };

  const dynamicNavigationItems = getNavigationItems();

  // Filter navigation items based on current route
  const filteredItems = isCompanyDashboard 
    ? dynamicNavigationItems // Show all navigation items on company dashboard in Menus tab
    : isMessagesPage
      ? [] // No navigation items on messages page
      : isIssuesPage
        ? dynamicNavigationItems.filter(item => item.title === "Company Dashboard") // Show only Company Dashboard on issues page
        : projectId 
          ? dynamicNavigationItems // Show all items for project pages
          : [];

  // Don't show navigation items if no project is selected and not on dashboard, messages, or issues
  if (!projectId && !isCompanyDashboard && !isMessagesPage && !isIssuesPage) {
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
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <SidebarMenuButton 
                        asChild 
                        className="w-full justify-start hover:bg-gray-100 text-gray-700 hover:text-black transition-colors"
                      >
                         <a href={item.url} className="flex items-center space-x-3 p-3 rounded-lg w-full">
                           <item.icon className="h-5 w-5" />
                           <span className="font-medium flex-1">{item.title}</span>
                         </a>
                      </SidebarMenuButton>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p>{item.title}</p>
                    </TooltipContent>
                  </Tooltip>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Software Issues Section - Show on company dashboard and project pages */}
        {(isCompanyDashboard || (projectId && !isIssuesPage)) && (
          <>
            <SidebarSeparator className="my-4 bg-gray-200 -mx-3" />
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton 
                      asChild 
                      className="w-full justify-start hover:bg-gray-100 text-gray-700 hover:text-black transition-colors"
                    >
                       <a href="/issues" className="flex items-center p-3 rounded-lg w-full">
                         <AlertTriangle className="h-5 w-5 mr-3 flex-shrink-0" />
                         <span className="font-medium whitespace-nowrap">Software Issues</span>
                         <div className="flex items-center gap-1 ml-auto">
                           {totalNormalIssues > 0 && (
                             <span className="bg-gray-800 text-white rounded-full min-w-5 h-5 flex items-center justify-center text-xs font-medium">
                               {totalNormalIssues > 99 ? '99+' : totalNormalIssues}
                             </span>
                           )}
                           {totalHighIssues > 0 && (
                             <span className="bg-destructive text-destructive-foreground rounded-full min-w-5 h-5 flex items-center justify-center text-xs font-medium">
                               {totalHighIssues > 99 ? '99+' : totalHighIssues}
                             </span>
                           )}
                         </div>
                       </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>
    </TooltipProvider>
  );
}
