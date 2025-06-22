
import { useState } from "react";
import { useLocation } from "react-router-dom";
import { 
  Calendar, 
  Calculator, 
  DollarSign, 
  FileText, 
  Home, 
  Users,
  File,
  Image,
  ChevronDown
} from "lucide-react";
import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const navigationItems = [
  {
    title: "Project Dashboard",
    url: "/",
    icon: Home,
  },
  {
    title: "Documents",
    icon: FileText,
    submenu: [
      {
        title: "Files",
        url: "/files",
        icon: File,
      },
      {
        title: "Photos",
        url: "/photos", 
        icon: Image,
      }
    ]
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
    title: "AI Estimating",
    url: "/estimating",
    icon: Calculator,
  },
  {
    title: "Schedules",
    url: "/schedules",
    icon: Calendar,
  },
  {
    title: "Companies",
    url: "/companies",
    icon: Users,
  },
];

export function SidebarNavigation() {
  const location = useLocation();
  const [documentsOpen, setDocumentsOpen] = useState(false);

  // Get current project ID from URL
  const getProjectId = () => {
    const pathParts = location.pathname.split('/');
    return pathParts[2]; // /project/{id}
  };

  const projectId = getProjectId();

  return (
    <SidebarContent className="px-3 py-4">
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            {navigationItems.map((item) => (
              <SidebarMenuItem key={item.title}>
                {item.submenu ? (
                  <Collapsible open={documentsOpen} onOpenChange={setDocumentsOpen}>
                    <CollapsibleTrigger asChild>
                      <button className="flex items-center w-full space-x-3 p-3 rounded-lg hover:bg-gray-100 text-gray-700 hover:text-black transition-colors">
                        <item.icon className="h-5 w-5" />
                        <span className="font-medium flex-1 text-left">{item.title}</span>
                        <ChevronDown className={`h-4 w-4 transition-transform ${documentsOpen ? 'rotate-180' : ''}`} />
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub className="ml-6 mt-2">
                        {item.submenu.map((subItem) => (
                          <SidebarMenuSubItem key={subItem.title}>
                            <SidebarMenuSubButton asChild>
                              <a 
                                href={projectId ? `/project/${projectId}${subItem.url}` : subItem.url}
                                className="flex items-center space-x-3 p-3 rounded-lg"
                              >
                                <subItem.icon className="h-4 w-4" />
                                <span>{subItem.title}</span>
                              </a>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </Collapsible>
                ) : (
                  <SidebarMenuButton 
                    asChild 
                    className="w-full justify-start hover:bg-gray-100 text-gray-700 hover:text-black transition-colors"
                  >
                    <a href={item.url} className="flex items-center space-x-3 p-3 rounded-lg">
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
  );
}
