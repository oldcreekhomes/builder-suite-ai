import { Calculator, Home } from "lucide-react";
import { Link } from "react-router-dom";
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
];

export function AccountingSidebar() {
  return (
    <SidebarContent className="px-3 py-4 flex-1">
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            {items.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton 
                  asChild 
                  className="w-full justify-start hover:bg-gray-100 text-gray-700 hover:text-black transition-colors"
                >
                  <Link to={item.url} className="flex items-center space-x-3 p-3 rounded-lg w-full">
                    <item.icon className="h-5 w-5" />
                    <span className="font-medium flex-1">{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
  );
}