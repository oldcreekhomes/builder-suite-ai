
import { 
  Building2, 
  Calendar, 
  Calculator, 
  DollarSign, 
  FileText, 
  Home, 
  Settings,
  Users,
  BarChart3
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from "@/components/ui/sidebar";

const navigationItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: Home,
  },
  {
    title: "Projects",
    url: "/projects",
    icon: Building2,
  },
  {
    title: "Scheduling",
    url: "/scheduling",
    icon: Calendar,
  },
  {
    title: "AI Estimating",
    url: "/estimating",
    icon: Calculator,
  },
  {
    title: "Budgets",
    url: "/budgets",
    icon: DollarSign,
  },
  {
    title: "Bidding",
    url: "/bidding",
    icon: FileText,
  },
  {
    title: "Analytics",
    url: "/analytics",
    icon: BarChart3,
  },
  {
    title: "Team",
    url: "/team",
    icon: Users,
  },
];

const settingsItems = [
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
  },
];

export function AppSidebar() {
  return (
    <Sidebar className="border-r border-gray-200">
      <SidebarHeader className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <Building2 className="h-8 w-8 text-black" />
          <div>
            <h1 className="text-xl font-bold text-black">BuildCore</h1>
            <p className="text-sm text-gray-600">Construction Management</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="px-3 py-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-gray-700 font-medium mb-2">
            Main Menu
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    className="w-full justify-start hover:bg-gray-100 text-gray-700 hover:text-black transition-colors"
                  >
                    <a href={item.url} className="flex items-center space-x-3 p-3 rounded-lg">
                      <item.icon className="h-5 w-5" />
                      <span className="font-medium">{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        
        <SidebarGroup className="mt-8">
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    className="w-full justify-start hover:bg-gray-100 text-gray-700 hover:text-black transition-colors"
                  >
                    <a href={item.url} className="flex items-center space-x-3 p-3 rounded-lg">
                      <item.icon className="h-5 w-5" />
                      <span className="font-medium">{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
