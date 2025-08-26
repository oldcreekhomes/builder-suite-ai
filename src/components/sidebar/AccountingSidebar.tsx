import { Calculator, Home, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar";

export function AccountingSidebar() {
  return (
    <SidebarContent className="px-3 py-4 flex-1">
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton 
                asChild 
                className="w-full justify-start hover:bg-gray-100 text-gray-700 hover:text-black transition-colors"
              >
                <Link to="/" className="flex items-center space-x-3 p-3 rounded-lg w-full">
                  <Home className="h-5 w-5" />
                  <span className="font-medium flex-1">Company Dashboard</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            
            <SidebarMenuItem>
              <SidebarMenuButton 
                asChild 
                className="w-full justify-start hover:bg-gray-100 text-gray-700 hover:text-black transition-colors"
              >
                <Link to="/accounting" className="flex items-center space-x-3 p-3 rounded-lg w-full">
                  <Calculator className="h-5 w-5" />
                  <span className="font-medium flex-1">Acct Dashboard</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            
            <SidebarMenuItem>
              <div className="flex items-center space-x-3 p-3 rounded-lg w-full text-gray-700 cursor-default">
                <FileText className="h-5 w-5" />
                <span className="font-medium flex-1">Bills</span>
              </div>
              <SidebarMenuSub>
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton asChild>
                    <Link to="/accounting/bills/approval-status" className="w-full">
                      Approval Status
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton asChild>
                    <Link to="/accounting/bills/enter" className="w-full">
                      Enter Bills
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              </SidebarMenuSub>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
  );
}