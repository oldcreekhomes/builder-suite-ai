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
  placeholder = "Job",
  className 
}: JobSearchInputProps) {
  const [searchQuery, setSearchQuery] = useState(value);
  const [showResults, setShowResults] = useState(false);
  const { searchProjects, loading } = useProjectSearch();

  useEffect(() => {
    setSearchQuery(value);
  }, [value]);

  const filteredProjects = searchQuery.length >= 3 ? searchProjects(searchQuery) : [];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchQuery(newValue);
    onChange(newValue);
    setShowResults(newValue.length >= 3);
  };

  const handleInputFocus = () => {
    if (searchQuery.length >= 3) {
      setShowResults(true);
    }
  };

  const handleInputBlur = () => {
    // Delay hiding results to allow for selection
    setTimeout(() => setShowResults(false), 200);
  };

  const handleSelectProject = (project: { name: string; address?: string }) => {
    const selectedValue = project.name;
    setSearchQuery(selectedValue);
    onChange(selectedValue);
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
      
      {showResults && filteredProjects.length > 0 && (
        <div className="absolute z-50 mt-1 max-h-32 w-full overflow-auto rounded border bg-background shadow-sm">
          {filteredProjects.slice(0, 5).map((project) => (
            <button
              key={project.id}
              type="button"
              className="block w-full px-2 py-1 text-left text-xs hover:bg-muted"
              onMouseDown={() => handleSelectProject(project)}
            >
              <span className="font-medium">{project.name}</span>
              {project.address && (
                <span className="text-muted-foreground"> - {project.address}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}