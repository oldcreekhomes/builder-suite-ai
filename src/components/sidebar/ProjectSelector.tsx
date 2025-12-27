import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { MapPin, ChevronsUpDown, Search } from "lucide-react";
import { useProjects } from "@/hooks/useProjects";
import { useUserRole } from "@/hooks/useUserRole";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";

const statusGroups = [
  { status: "In Design", color: "bg-yellow-100 text-yellow-800" },
  { status: "Permitting", color: "bg-blue-100 text-blue-800" },
  { status: "Under Construction", color: "bg-orange-100 text-orange-800" },
  { status: "Completed", color: "bg-green-100 text-green-800" },
  { status: "Permanently Closed", color: "bg-gray-100 text-gray-600" },
];

export function ProjectSelector() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { projectId } = useParams();
  const { data: projects = [], isLoading } = useProjects();
  const { isOwner } = useUserRole();

  // Find current project if on a project page
  const currentProject = projects.find((p) => p.id === projectId);

  // Group projects by status
  const projectsByStatus = statusGroups.map((group) => ({
    ...group,
    projects: projects.filter((p) => p.status === group.status),
  }));

  const handleSelectProject = (project: any) => {
    navigate(`/project/${project.id}`);
    setOpen(false);
  };

  return (
    <div className="px-4 py-3 border-b border-border bg-white">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between h-10 bg-white hover:bg-gray-50"
          >
            <div className="flex items-center space-x-2 truncate">
              <MapPin className="h-4 w-4 text-gray-500 shrink-0" />
              <span className="truncate">
                {currentProject ? currentProject.address : "Select Project"}
              </span>
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-white" align="start">
          <Command className="bg-white">
            <div className="flex items-center border-b px-3">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <CommandInput placeholder="Search projects..." className="h-9 border-0 focus:ring-0" />
            </div>
            <CommandList className="max-h-[400px]">
              <CommandEmpty>No projects found.</CommandEmpty>
              {projectsByStatus.map((group) => {
                // Hide "Permanently Closed" for non-owners
                if (group.status === "Permanently Closed" && !isOwner) return null;
                if (group.projects.length === 0) return null;
                return (
                  <CommandGroup
                    key={group.status}
                    heading={
                      <span className={`text-xs font-semibold px-2 py-1 rounded ${group.color}`}>
                        {group.status}
                      </span>
                    }
                  >
                    {group.projects.map((project) => (
                      <CommandItem
                        key={project.id}
                        value={project.address}
                        onSelect={() => handleSelectProject(project)}
                        className="cursor-pointer"
                      >
                        <MapPin className="mr-2 h-4 w-4 text-gray-400" />
                        <span className="truncate">{project.address}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                );
              })}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
