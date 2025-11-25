import React, { useState, useEffect } from "react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, ChevronsUpDown, X, Users, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProjectResources } from "@/hooks/useProjectResources";

interface ResourcesSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
  readOnly?: boolean;
}

export function ResourcesSelector({ value, onValueChange, className, readOnly = false }: ResourcesSelectorProps) {
  const [open, setOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedResources, setSelectedResources] = useState<string[]>([]);
  
  // Use the project resources hook
  const { resources, isLoading } = useProjectResources();

  // Parse the current value into selected resources
  useEffect(() => {
    if (value) {
      const resourceNames = value.split(',').map(r => r.trim()).filter(Boolean);
      setSelectedResources(resourceNames);
    } else {
      setSelectedResources([]);
    }
  }, [value]);

  const handleSelect = (resourceName: string) => {
    const newResources = selectedResources.includes(resourceName)
      ? selectedResources.filter(r => r !== resourceName)
      : [...selectedResources, resourceName];
    
    setSelectedResources(newResources);
    onValueChange(newResources.join(', '));
  };

  const handleRemove = (resourceName: string) => {
    const newResources = selectedResources.filter(r => r !== resourceName);
    setSelectedResources(newResources);
    onValueChange(newResources.join(', '));
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(part => part.charAt(0)).join('').toUpperCase();
  };

  const getDisplayText = () => {
    if (selectedResources.length === 0) return "Select...";
    if (selectedResources.length === 1) {
      return getInitials(selectedResources[0]);
    }
    return `${selectedResources.length} selected`;
  };

  
  const handleStartEdit = () => {
    setIsEditing(true);
    setOpen(true);
  };

  const handleFinishEdit = () => {
    setIsEditing(false);
    setOpen(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setIsEditing(false);
    }
  };

  // If readOnly, always show as non-editable text
  if (readOnly) {
    return (
      <span className={cn("text-xs px-1 py-0.5 block text-black", className)}>
        {selectedResources.length > 0 ? selectedResources.join(', ') : ""}
      </span>
    );
  }

  // Always show selected resources as plain text when not editing and has resources
  if (selectedResources.length > 0 && !isEditing) {
    const additionalCount = selectedResources.length - 1;
    return (
      <span 
        className={cn("cursor-text hover:bg-muted rounded px-1 py-0.5 text-xs flex items-center gap-1 whitespace-nowrap", className)}
        onClick={handleStartEdit}
        title={selectedResources.join(', ')}
      >
        <span className="truncate max-w-[100px]">{selectedResources[0]}</span>
        {additionalCount > 0 && (
          <span className="bg-muted text-muted-foreground px-1 rounded text-[10px] flex-shrink-0 font-medium">
            +{additionalCount}
          </span>
        )}
      </span>
    );
  }

  // Show "Select..." as plain text when no resources and not editing
  if (!isEditing) {
    return (
      <span 
        className={cn("cursor-text hover:bg-muted rounded px-1 py-0.5 text-xs text-muted-foreground", className)}
        onClick={handleStartEdit}
        title="Click to select resources"
      >
        Select...
      </span>
    );
  }

  // Only show the dropdown when editing or no resources selected
  return (
    <div className={cn("relative", className)}>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="h-8 text-xs justify-between"
          >
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="text-xs">
                {getDisplayText()}
              </span>
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" onEscapeKeyDown={handleFinishEdit}>
          <Command>
            <CommandInput placeholder="Search users and representatives..." onKeyDown={(e) => {
              if (e.key === 'Escape') {
                handleFinishEdit();
              }
            }} />
            <CommandList>
              <CommandEmpty>
                {isLoading ? "Loading..." : "No resources found."}
              </CommandEmpty>
              
              {/* Internal Users */}
              <CommandGroup heading="Internal Users">
                {resources
                  .filter(resource => resource.resourceGroup === 'Internal')
                  .map((resource) => {
                    const isSelected = selectedResources.includes(resource.resourceName);
                    
                    return (
                      <CommandItem
                        key={`user-${resource.resourceId}`}
                        value={resource.resourceName}
                        onSelect={() => handleSelect(resource.resourceName)}
                      >
                        <div className="flex items-center space-x-2 flex-1">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <div className="font-medium">{resource.resourceName}</div>
                          <Check
                            className={cn(
                              "ml-auto h-4 w-4",
                              isSelected ? "opacity-100" : "opacity-0"
                            )}
                          />
                        </div>
                      </CommandItem>
                    );
                  })}
              </CommandGroup>

              {/* Company Representatives */}
              <CommandGroup heading="Company Representatives">
                {resources
                  .filter(resource => resource.resourceGroup === 'External')
                  .map((resource) => {
                    const isSelected = selectedResources.includes(resource.resourceName);
                    
                    return (
                      <CommandItem
                        key={`rep-${resource.resourceId}`}
                        value={resource.resourceName}
                        onSelect={() => handleSelect(resource.resourceName)}
                      >
                        <div className="flex items-center space-x-2 flex-1 min-w-0">
                          <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <div className="font-medium truncate">
                            <span>{resource.resourceName}</span>
                          </div>
                          <Check
                            className={cn(
                              "ml-auto h-4 w-4 flex-shrink-0",
                              isSelected ? "opacity-100" : "opacity-0"
                            )}
                          />
                        </div>
                      </CommandItem>
                    );
                  })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

    </div>
  );
}