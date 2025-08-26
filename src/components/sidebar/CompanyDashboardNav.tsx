import { Home, Calculator, Bug } from "lucide-react";
import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";

const items = [
  { title: "Company Dashboard", url: "/", icon: Home },
  { title: "Accounting", url: "/accounting", icon: Calculator },
  { title: "Software Issues", url: "/issues", icon: Bug },
];

export function CompanyDashboardNav() {
  return (
    <SidebarContent className="px-3 py-4 flex-none">
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            {items.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton 
                  asChild 
                  className="w-full justify-start hover:bg-gray-100 text-gray-700 hover:text-black transition-colors"
                >
                  <a href={item.url} className="flex items-center space-x-3 p-3 rounded-lg w-full">
                    <item.icon className="h-5 w-5" />
                    <span className="font-medium flex-1">{item.title}</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
  );
}