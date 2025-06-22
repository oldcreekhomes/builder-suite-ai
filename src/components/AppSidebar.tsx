
import { Sidebar } from "@/components/ui/sidebar";
import { SidebarBranding } from "./sidebar/SidebarBranding";
import { SidebarNavigation } from "./sidebar/SidebarNavigation";
import { SidebarUserDropdown } from "./sidebar/SidebarUserDropdown";

export function AppSidebar() {
  return (
    <Sidebar className="border-r border-gray-200">
      <SidebarBranding />
      <SidebarNavigation />
      <SidebarUserDropdown />
    </Sidebar>
  );
}
