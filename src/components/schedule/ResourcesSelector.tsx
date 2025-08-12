import React, { useState, useEffect } from "react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, ChevronsUpDown, X, Users, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  company_name: string;
}

interface CompanyRepresentative {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  title: string;
  company_id: string;
}

interface ResourcesSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
}

export function ResourcesSelector({ value, onValueChange, className }: ResourcesSelectorProps) {
  const [open, setOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [representatives, setRepresentatives] = useState<CompanyRepresentative[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedResources, setSelectedResources] = useState<string[]>([]);

  // Parse the current value into selected resources
  useEffect(() => {
    if (value) {
      const resources = value.split(',').map(r => r.trim()).filter(Boolean);
      setSelectedResources(resources);
    } else {
      setSelectedResources([]);
    }
  }, [value]);

  // Fetch users and representatives
  useEffect(() => {
    const fetchResources = async () => {
      setLoading(true);
      try {
        // Fetch internal users
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('id, first_name, last_name, email, role, company_name')
          .order('first_name');

        if (usersError) throw usersError;

        // Fetch company representatives with company names (only those with schedule notifications enabled)
        const { data: repsData, error: repsError } = await supabase
          .from('company_representatives')
          .select(`
            id, 
            first_name, 
            last_name, 
            email, 
            title,
            company_id,
            companies(company_name)
          `)
          .eq('receive_schedule_notifications', true)
          .order('first_name');

        if (repsError) throw repsError;

        setUsers(usersData || []);
        setRepresentatives(repsData || []);
      } catch (error) {
        console.error('Error fetching resources:', error);
      } finally {
        setLoading(false);
      }
    };

    if (open) {
      fetchResources();
    }
  }, [open]);

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

  const formatUserName = (user: User) => `${user.first_name} ${user.last_name}`;
  const formatRepName = (rep: CompanyRepresentative & { companies?: { company_name: string } }) => 
    `${rep.first_name} ${rep.last_name}`;
  
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

  // Always show selected resources as plain text when not editing
  if (selectedResources.length > 0 && !isEditing) {
    return (
      <span 
        className={cn("cursor-text hover:bg-muted rounded px-1 py-0.5 block text-xs", className)}
        onClick={handleStartEdit}
        title="Click to edit resources"
      >
        {selectedResources.join(', ')}
      </span>
    );
  }

  return (
    <div className={cn("relative", className)}>
      <Popover open={open} onOpenChange={setOpen}>
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
                {loading ? "Loading..." : "No resources found."}
              </CommandEmpty>
              
              {/* Internal Users */}
              <CommandGroup heading="Internal Users">
                {users.map((user) => {
                  const userName = formatUserName(user);
                  const isSelected = selectedResources.includes(userName);
                  
                  return (
                    <CommandItem
                      key={`user-${user.id}`}
                      value={userName}
                      onSelect={() => handleSelect(userName)}
                    >
                      <div className="flex items-center space-x-2 flex-1">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <div className="font-medium">{userName}</div>
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
                {representatives.map((rep: any) => {
                  const repName = formatRepName(rep);
                  const isSelected = selectedResources.includes(repName);
                  
                  return (
                    <CommandItem
                      key={`rep-${rep.id}`}
                      value={repName}
                      onSelect={() => handleSelect(repName)}
                    >
                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                        <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div className="font-medium truncate">
                          <span>{repName}</span>
                          {rep.companies && (
                            <span className="text-muted-foreground font-normal"> - {rep.companies.company_name}</span>
                          )}
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