import { useState } from "react";
import { MapPin, ChevronsUpDown, Search, MoreVertical } from "lucide-react";
import { useProjects, Project } from "@/hooks/useProjects";
import { useUserRole } from "@/hooks/useUserRole";
import { useNotificationPreferences } from "@/hooks/useNotificationPreferences";
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
import { EditProjectDialog } from "@/components/EditProjectDialog";
import { PROJECT_STATUS_GROUPS } from "@/constants/projectStatusGroups";
import { cn } from "@/lib/utils";

interface Props {
  value?: string;
  onSelect: (project: Project) => void;
  placeholder?: string;
  triggerClassName?: string;
  showEditButton?: boolean;
}

/**
 * Shared project picker: searchable, status-grouped list with the same
 * colored group headings as the sidebar. Single source of truth for every
 * project dropdown in the app.
 */
export function ProjectPickerPopover({
  value,
  onSelect,
  placeholder = "Select Project",
  triggerClassName,
  showEditButton = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const { data: projects = [] } = useProjects();
  const { isOwner } = useUserRole();
  const { preferences } = useNotificationPreferences();

  const canEditProjects = showEditButton && (isOwner || preferences.can_edit_projects);
  const currentProject = projects.find((p) => p.id === value);

  const projectsByStatus = PROJECT_STATUS_GROUPS.map((group) => ({
    ...group,
    projects: projects.filter((p) => p.status === group.status),
  }));

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn("w-full justify-between h-10 bg-white hover:bg-gray-50", triggerClassName)}
          >
            <div className="flex items-center space-x-2 truncate">
              <MapPin className="h-4 w-4 text-gray-500 shrink-0" />
              <span className="truncate">
                {currentProject ? currentProject.address : placeholder}
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
                        onSelect={() => {
                          onSelect(project);
                          setOpen(false);
                        }}
                        className="cursor-pointer"
                      >
                        {canEditProjects ? (
                          <button
                            type="button"
                            className="mr-2 p-0.5 rounded hover:bg-muted shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpen(false);
                              setEditProject(project);
                            }}
                            title="Edit project"
                          >
                            <MoreVertical className="h-4 w-4 text-muted-foreground" />
                          </button>
                        ) : (
                          <MapPin className="mr-2 h-4 w-4 text-muted-foreground" />
                        )}
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

      {showEditButton && (
        <EditProjectDialog
          project={editProject}
          open={!!editProject}
          onOpenChange={(o) => { if (!o) setEditProject(null); }}
        />
      )}
    </>
  );
}
