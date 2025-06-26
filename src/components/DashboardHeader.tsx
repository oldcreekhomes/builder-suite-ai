import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Plus, Bell, Search, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { NewProjectDialog } from "@/components/NewProjectDialog";
import { useProjects } from "@/hooks/useProjects";
import { useNavigate } from "react-router-dom";
import { useUserProfile } from "@/hooks/useUserProfile";
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

interface DashboardHeaderProps {
  title?: string;
}

export function DashboardHeader({ title }: DashboardHeaderProps) {
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const { data: projects = [] } = useProjects();
  const { profile } = useUserProfile();
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

  const handleSearchInputChange = (value: string) => {
    setSearchValue(value);
    if (value.length > 0) {
      setSearchOpen(true);
    }
  };

  const handleInputFocus = () => {
    setSearchOpen(true);
  };

  const handleInputBlur = () => {
    // Delay closing to allow for clicking on items
    setTimeout(() => {
      setSearchOpen(false);
    }, 200);
  };

  // Get company name from profile, fallback to "Company"
  const companyName = profile?.company_name || "Company";
  
  // Use provided title or fallback to company name
  const displayTitle = title || companyName;

  return (
    <>
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <SidebarTrigger className="text-gray-600 hover:text-black h-8 w-8 flex items-center justify-center">
              <ArrowLeft className="h-4 w-4" />
            </SidebarTrigger>
            <div>
              <h1 className="text-2xl font-bold text-black">{displayTitle}</h1>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <Popover open={searchOpen} onOpenChange={setSearchOpen}>
              <PopoverTrigger asChild>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input 
                    placeholder="Search projects..." 
                    className="pl-10 w-64 bg-gray-50 border-gray-200 focus:bg-white"
                    value={searchValue}
                    onChange={(e) => handleSearchInputChange(e.target.value)}
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                  />
                </div>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-0" align="end">
                <Command>
                  <CommandList>
                    <CommandEmpty>
                      {searchValue ? "No projects found." : "Start typing to search projects..."}
                    </CommandEmpty>
                    {filteredProjects.length > 0 && (
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
                    )}
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
