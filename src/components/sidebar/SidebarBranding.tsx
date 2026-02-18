import { SidebarHeader } from "@/components/ui/sidebar";
import { ProjectSelector } from "./ProjectSelector";

export function SidebarBranding() {
  return (
    <>
      <SidebarHeader className="px-6 py-2 border-b border-border bg-white">
        <div className="flex flex-col items-center">
          <a href="/" className="hover:opacity-80 transition-opacity mb-1">
            <h1 className="text-xl font-bold text-black">BuilderSuite<sub className="text-[0.45em] font-bold ml-0.5 align-baseline relative -bottom-0.5 border border-current rounded-full px-0.5 leading-none">ML</sub></h1>
          </a>
          <p className="text-sm text-gray-600">Construction Management</p>
        </div>
      </SidebarHeader>
      <ProjectSelector />
    </>
  );
}
