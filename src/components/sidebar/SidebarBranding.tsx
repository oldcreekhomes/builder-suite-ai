import { SidebarHeader, useSidebar } from "@/components/ui/sidebar";
import { ProjectSelector } from "./ProjectSelector";
import { ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SidebarBranding() {
  const { toggleSidebar, state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <>
      <SidebarHeader className="px-6 py-2 border-b border-border bg-white relative">
        <div className="flex flex-col items-center">
          <a href="/" className="hover:opacity-80 transition-opacity mb-1">
            <h1 className="text-xl font-bold text-black">BuilderSuiteML</h1>
          </a>
          <p className="text-sm text-gray-600">Construction Management</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="absolute top-2 right-2 h-6 w-6 text-muted-foreground hover:text-foreground"
        >
          {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
        </Button>
      </SidebarHeader>
      <ProjectSelector />
    </>
  );
}
