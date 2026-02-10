import { Building2 } from "lucide-react";
import { SidebarHeader } from "@/components/ui/sidebar";
import { ProjectSelector } from "./ProjectSelector";

export function SidebarBranding() {
  return (
    <>
      <SidebarHeader className="px-6 py-2 border-b border-border bg-white">
        <div className="flex items-end justify-between">
          <div className="flex flex-col">
            <a href="/" className="flex items-end space-x-2 mb-1 hover:opacity-80 transition-opacity">
              <Building2 className="h-8 w-8 text-black" />
              <h1 className="text-xl font-bold text-black">BuilderSuite<sup className="text-[0.5em] font-bold ml-0.5 align-super border border-current rounded-full px-0.5">ML</sup></h1>
            </a>
            <p className="text-sm text-gray-600">Construction Management</p>
          </div>
        </div>
      </SidebarHeader>
      <ProjectSelector />
    </>
  );
}
