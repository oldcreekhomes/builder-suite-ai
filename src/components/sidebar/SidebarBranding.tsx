
import { Building2 } from "lucide-react";
import { SidebarHeader } from "@/components/ui/sidebar";

export function SidebarBranding() {
  return (
    <SidebarHeader className="px-6 py-4 border-b border-border">
      <div className="flex items-end justify-between">
        <div className="flex flex-col">
          <a href="/" className="flex items-end space-x-2 mb-1 hover:opacity-80 transition-opacity">
            <Building2 className="h-8 w-8 text-black" />
            <h1 className="text-xl font-bold text-black">BuilderSuite AI</h1>
          </a>
          <p className="text-sm text-gray-600">Construction Management</p>
        </div>
      </div>
    </SidebarHeader>
  );
}
