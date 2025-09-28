import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useProjectSearch } from "@/hooks/useProjectSearch";

interface JobSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function JobSearchInput({ 
  value, 
  onChange, 
  placeholder = "Search jobs...",
  className 
}: JobSearchInputProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showResults, setShowResults] = useState(false);
  const { projects, loading } = useProjectSearch();

  useEffect(() => {
    // Find project address by ID for display
    if (value) {
      const project = projects.find(p => p.id === value);
      if (project) {
        setSearchQuery(project.address);
      }
    } else {
      setSearchQuery("");
    }
  }, [value, projects]);

  const filteredProjects = projects.filter(project =>
    project.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchQuery(newValue);
    setShowResults(true);
  };

  const handleInputFocus = () => {
    setShowResults(true);
  };

  const handleInputBlur = () => {
    // Delay hiding results to allow for selection
    setTimeout(() => setShowResults(false), 200);
  };

  const handleSelectProject = (project: { id: string; address: string }) => {
    setSearchQuery(project.address);
    onChange(project.id); // Pass project ID instead of address
    setShowResults(false);
  };

  return (
    <div className="relative">
      <Input
        type="text"
        value={searchQuery}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
        placeholder={placeholder}
        className={className}
      />
      
      {showResults && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover shadow-lg">
          {loading ? (
            <div className="p-2 text-sm text-muted-foreground">Loading...</div>
          ) : filteredProjects.length > 0 ? (
            filteredProjects.slice(0, 8).map((project) => (
              <button
                key={project.id}
                type="button"
                className="block w-full px-3 py-2 text-left text-sm hover:bg-accent cursor-pointer"
                onMouseDown={() => handleSelectProject(project)}
              >
                <div className="font-medium">{project.address}</div>
              </button>
            ))
          ) : searchQuery && (
            <div className="p-3 text-sm text-muted-foreground">
              No jobs found matching "{searchQuery}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}