
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Plus, Bell, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { NewProjectDialog } from "@/components/NewProjectDialog";
import { useProjects } from "@/hooks/useProjects";
import { useNavigate } from "react-router-dom";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function DashboardHeader() {
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const { data: projects = [] } = useProjects();
  const navigate = useNavigate();

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchValue.toLowerCase()) ||
    project.address.toLowerCase().includes(searchValue.toLowerCase())
  );

  const handleProjectSelect = (projectId: string) => {
    navigate(`/project/${projectId}`);
    setSearchOpen(false);
    setSearchValue("");
  };

  return (
    <>
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <SidebarTrigger className="text-gray-600 hover:text-black" />
            <div>
              <h1 className="text-2xl font-bold text-black">Dashboard</h1>
              <p className="text-gray-600">Welcome back! Here's your project overview.</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <Popover open={searchOpen} onOpenChange={setSearchOpen}>
              <PopoverTrigger asChild>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input 
                    placeholder="Search projects..." 
                    className="pl-10 w-64 bg-gray-50 border-gray-200 focus:bg-white cursor-pointer"
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    onFocus={() => setSearchOpen(true)}
                  />
                </div>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-0" align="end">
                <Command>
                  <CommandInput 
                    placeholder="Search projects..." 
                    value={searchValue}
                    onValueChange={setSearchValue}
                  />
                  <CommandList>
                    <CommandEmpty>No projects found.</CommandEmpty>
                    <CommandGroup>
                      {filteredProjects.map((project) => (
                        <CommandItem
                          key={project.id}
                          onSelect={() => handleProjectSelect(project.id)}
                          className="cursor-pointer"
                        >
                          <div className="flex flex-col">
                            <span className="font-medium">{project.name}</span>
                            <span className="text-sm text-gray-500">{project.address}</span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <Button variant="outline" size="sm" className="border-gray-200 hover:bg-gray-50">
              <Bell className="h-4 w-4" />
            </Button>
            <Button 
              className="bg-black hover:bg-gray-800 text-white"
              onClick={() => setIsNewProjectOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
          </div>
        </div>
      </header>

      <NewProjectDialog 
        open={isNewProjectOpen} 
        onOpenChange={setIsNewProjectOpen} 
      />
    </>
  );
}
