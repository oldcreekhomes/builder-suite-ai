
import { Building2 } from "lucide-react";
import { SidebarHeader, SidebarTrigger } from "@/components/ui/sidebar";

export function SidebarBranding() {
  return (
    <SidebarHeader className="p-6 border-b border-gray-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Building2 className="h-8 w-8 text-black" />
          <div>
            <h1 className="text-xl font-bold text-black">BuildCore</h1>
            <p className="text-sm text-gray-600">Construction Management</p>
          </div>
        </div>
        <SidebarTrigger className="text-gray-600 hover:text-black hover:bg-gray-100 transition-colors h-8 w-8" />
      </div>
    </SidebarHeader>
  );
}
