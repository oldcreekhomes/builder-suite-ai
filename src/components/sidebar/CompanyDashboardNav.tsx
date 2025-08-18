import { useLocation } from "react-router-dom";
import { Home, Calculator } from "lucide-react";
import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";

const items = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Accounting", url: "/accounting", icon: Calculator },
];

export function CompanyDashboardNav() {
  const location = useLocation();

  return (
    <SidebarContent className="px-3 py-4">
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            {items.map((item) => {
              const isActive = location.pathname === item.url;
              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    className={`w-full justify-start transition-colors ${
                      isActive 
                        ? "bg-primary text-primary-foreground" 
                        : "hover:bg-gray-100 text-gray-700 hover:text-black"
                    }`}
                  >
                    <a href={item.url} className="flex items-center space-x-3 p-3 rounded-lg w-full">
                      <item.icon className="h-5 w-5" />
                      <span className="font-medium flex-1">{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
  );
}