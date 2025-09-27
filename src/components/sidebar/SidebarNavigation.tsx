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
  Calculator,
  Brain
} from "lucide-react";
import { UnreadBadge } from "@/components/ui/unread-badge";
import { useCompanyUsers } from "@/hooks/useCompanyUsers";
import { UnreadCounts } from "@/hooks/useMasterChatRealtime";
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
    title: "Estimating AI",
    url: "/estimating-ai",
    icon: Brain,
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
      <div className="flex-1 overflow-y-auto">
        <div className="px-3 py-1">
          <div>
            {filteredItems.map((item) => (
              <div key={item.title}>
                {item.title === "Estimating AI" ? (
                  <div className="flex items-center space-x-2 px-2 py-2 rounded-lg w-full hover:bg-gray-100 text-gray-700 hover:text-black transition-colors text-sm">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center space-x-2 flex-1 cursor-pointer">
                          <item.icon className="h-4 w-4" />
                          <span className="flex-1">{item.title}</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs p-4">
                        <p>Estimating AI is a paid feature for Home Builders. Step #1: Build your database of costs. Step #2: Add your drawings. Step #3: Let Estimating do a take off of your drawings and build a budget in 15-30 seconds. Something that used to take days now takes seconds.</p>
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-4 w-4 text-black cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs p-4">
                        <p>Estimating AI is a paid feature for Home Builders. Step #1: Build your database of costs. Step #2: Add your drawings. Step #3: Let Estimating do a take off of your drawings and build a budget in 15-30 seconds. Something that used to take days now takes seconds.</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                ) : (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <a 
                        href={item.url} 
                        className="flex items-center space-x-2 px-2 py-2 rounded-lg w-full hover:bg-gray-100 text-gray-700 hover:text-black transition-colors text-sm"
                      >
                        <item.icon className="h-4 w-4" />
                        <span className="flex-1">{item.title}</span>
                      </a>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p>{item.title}</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            ))}
          </div>

          {/* Software Issues Section - Show on company dashboard and project pages */}
          {(isCompanyDashboard || (projectId && !isIssuesPage)) && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div>
                <a href="/issues" className="flex items-center px-2 py-2 rounded-lg w-full hover:bg-gray-100 text-gray-700 hover:text-black transition-colors text-sm">
                  <AlertTriangle className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span className="whitespace-nowrap">Software Issues</span>
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
              </div>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
