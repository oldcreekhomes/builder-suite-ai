import { useLocation } from "react-router-dom";
import { useState } from "react";

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
  ArrowLeft,
  ChevronDown,
  BarChart3
} from "lucide-react";
import { UnreadBadge } from "@/components/ui/unread-badge";
import { useCompanyUsers } from "@/hooks/useCompanyUsers";
import { UnreadCounts } from "@/hooks/useMasterChatRealtime";
import { useIssueCounts } from "@/hooks/useIssueCounts";
import { useProjectContextWithData } from "@/hooks/useProjectContext";
import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
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
  const { projectContext, goBackToProject, hasProjectContext } = useProjectContextWithData();
  
  // State for collapsible sections
  const [transactionsExpanded, setTransactionsExpanded] = useState(false);
  
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

  // Check if we're on the Company Dashboard, Messages page, Issues page, or global pages
  const isCompanyDashboard = location.pathname === '/';
  const isMessagesPage = location.pathname === '/messages' || location.pathname.includes('/messages');
  const isIssuesPage = location.pathname === '/issues';
  const isGlobalPage = location.pathname === '/settings' || 
                      location.pathname === '/companies' || 
                      location.pathname === '/employees';
  
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
        <div className="px-3 py-0">
          {/* Show recent project section on global pages */}
          {isGlobalPage && hasProjectContext && projectContext && (
            <div className="mb-2 pb-2 border-b border-gray-200">
              <button
                onClick={goBackToProject}
                className="flex items-center space-x-2 px-2 py-1.5 rounded-lg w-full hover:bg-gray-100 text-gray-700 hover:text-black transition-colors text-sm"
              >
                <ArrowLeft className="h-4 w-4" />
                <div className="flex-1 text-left">
                  <div className="font-medium">Back to Project</div>
                  <div className="text-xs text-gray-500 truncate">
                    {projectContext.projectName}
                  </div>
                </div>
              </button>
            </div>
          )}
          
          <div className="space-y-0.5">
            {filteredItems.map((item) => (
              <div key={item.title}>
                <a 
                  href={item.url} 
                  className="flex items-center space-x-2 px-2 py-1.5 rounded-lg w-full hover:bg-gray-100 text-gray-700 hover:text-black transition-colors text-sm"
                >
                  <item.icon className="h-4 w-4" />
                  <span className="flex-1">{item.title}</span>
                </a>
              </div>
            ))}
            
            {/* Accounting Section - Direct navigation (only show for project pages) */}
            {projectId && (
              <div>
                <a 
                  href={`/project/${projectId}/accounting`}
                  className="flex items-center space-x-2 px-2 py-1.5 rounded-lg w-full hover:bg-gray-100 text-gray-700 hover:text-black transition-colors text-sm"
                >
                  <Calculator className="h-4 w-4" />
                  <span className="flex-1">Accounting</span>
                </a>
                
                {/* Bills and Reports submenu items */}
                <div className="ml-6 mt-0.5 space-y-0.5">
                  <a href={`/project/${projectId}/accounting/bills/approve`} className="flex items-center space-x-2 px-2 py-1 rounded-lg w-full hover:bg-gray-100 text-gray-700 hover:text-black transition-colors text-sm">
                    <FileText className="h-4 w-4" />
                    <span>Manage Bills</span>
                  </a>
                  
                  <a href={`/project/${projectId}/accounting/transactions`} className="flex items-center space-x-2 px-2 py-1 rounded-lg w-full hover:bg-gray-100 text-gray-700 hover:text-black transition-colors text-sm">
                    <FileText className="h-4 w-4" />
                    <span>Transactions</span>
                  </a>
                  
                  <a href={`/project/${projectId}/accounting/reports`} className="flex items-center space-x-2 px-2 py-1 rounded-lg w-full hover:bg-gray-100 text-gray-700 hover:text-black transition-colors text-sm">
                    <BarChart3 className="h-4 w-4" />
                    <span>Reports</span>
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Software Issues Section - Show on company dashboard and project pages */}
          {(isCompanyDashboard || (projectId && !isIssuesPage)) && (
            <div className="pt-2 mt-2 border-t border-gray-200">
              <div>
                <a href="/issues" className="flex items-center px-2 py-1.5 rounded-lg w-full hover:bg-gray-100 text-gray-700 hover:text-black transition-colors text-sm">
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
