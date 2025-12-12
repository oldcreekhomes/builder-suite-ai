import React, { useState, useEffect, useMemo } from "react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Check, ChevronsUpDown, Users, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProjectResources, CompanyWithRepresentatives } from "@/hooks/useProjectResources";
import { CompanyResourcesDialog } from "./CompanyResourcesDialog";

interface ResourcesSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
  readOnly?: boolean;
}

// Parse the resources value which can be:
// Old format: "Tom Koo, Josefina An" (comma-separated names)
// New format: JSON with companies and their selected representatives
interface ParsedResources {
  companies: {
    companyId: string;
    companyName: string;
    selectedRepIds: string[];
  }[];
  internalUsers: string[];
}

function parseResourcesValue(value: string, availableCompanies: CompanyWithRepresentatives[]): ParsedResources {
  if (!value) {
    return { companies: [], internalUsers: [] };
  }

  // Try to parse as JSON first (new format)
  try {
    const parsed = JSON.parse(value);
    if (parsed.companies || parsed.internalUsers) {
      return parsed as ParsedResources;
    }
  } catch {
    // Not JSON, handle as legacy format - just return empty since we're migrating
  }

  return { companies: [], internalUsers: [] };
}

function serializeResources(parsed: ParsedResources): string {
  if (parsed.companies.length === 0 && parsed.internalUsers.length === 0) {
    return '';
  }
  return JSON.stringify(parsed);
}

export function ResourcesSelector({ value, onValueChange, className, readOnly = false }: ResourcesSelectorProps) {
  const [open, setOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<CompanyWithRepresentatives | null>(null);
  
  const { companies, internalUsers, isLoading } = useProjectResources();

  const parsedResources = useMemo(() => 
    parseResourcesValue(value, companies), 
    [value, companies]
  );

  const handleSelectCompany = (company: CompanyWithRepresentatives) => {
    // Check if company is already selected
    const existingIndex = parsedResources.companies.findIndex(c => c.companyId === company.companyId);
    
    if (existingIndex >= 0) {
      // Remove company
      const newCompanies = parsedResources.companies.filter(c => c.companyId !== company.companyId);
      const newParsed = { ...parsedResources, companies: newCompanies };
      onValueChange(serializeResources(newParsed));
    } else {
      // Add company with default selected reps (those with notifications enabled)
      const defaultRepIds = company.representatives
        .filter(rep => rep.receiveScheduleNotifications)
        .map(rep => rep.id);
      
      const newCompany = {
        companyId: company.companyId,
        companyName: company.companyName,
        selectedRepIds: defaultRepIds
      };
      const newParsed = {
        ...parsedResources,
        companies: [...parsedResources.companies, newCompany]
      };
      onValueChange(serializeResources(newParsed));
    }
    setOpen(false);
    setIsEditing(false);
  };

  const handleSelectInternalUser = (userId: string, userName: string) => {
    const existingIndex = parsedResources.internalUsers.indexOf(userId);
    
    if (existingIndex >= 0) {
      const newInternalUsers = parsedResources.internalUsers.filter(id => id !== userId);
      const newParsed = { ...parsedResources, internalUsers: newInternalUsers };
      onValueChange(serializeResources(newParsed));
    } else {
      const newParsed = {
        ...parsedResources,
        internalUsers: [...parsedResources.internalUsers, userId]
      };
      onValueChange(serializeResources(newParsed));
    }
  };

  const handleCompanyClick = (company: CompanyWithRepresentatives, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedCompany(company);
    setDialogOpen(true);
  };

  const handleSaveRepresentatives = (selectedRepIds: string[]) => {
    if (!selectedCompany) return;
    
    const newCompanies = parsedResources.companies.map(c => {
      if (c.companyId === selectedCompany.companyId) {
        return { ...c, selectedRepIds };
      }
      return c;
    });
    
    const newParsed = { ...parsedResources, companies: newCompanies };
    onValueChange(serializeResources(newParsed));
  };

  const handleStartEdit = () => {
    setIsEditing(true);
    setOpen(true);
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setIsEditing(false);
    }
  };

  // Get display text for the selected resources
  const getDisplayContent = () => {
    const items: React.ReactNode[] = [];
    
    // Add company names
    parsedResources.companies.forEach((company, index) => {
      const fullCompany = companies.find(c => c.companyId === company.companyId);
      const repCount = company.selectedRepIds.length;
      const defaultCount = fullCompany?.representatives.filter(r => r.receiveScheduleNotifications).length || 0;
      const extraCount = repCount - defaultCount;
      
      items.push(
        <span
          key={`company-${company.companyId}`}
          className="cursor-pointer hover:underline"
          onClick={(e) => fullCompany && handleCompanyClick(fullCompany, e)}
        >
          {company.companyName}
          {extraCount > 0 && (
            <span className="text-muted-foreground ml-0.5">(+{extraCount})</span>
          )}
        </span>
      );
    });

    // Add internal user names
    parsedResources.internalUsers.forEach((userId) => {
      const user = internalUsers.find(u => u.resourceId === userId);
      if (user) {
        items.push(
          <span key={`user-${userId}`}>
            {user.resourceName}
          </span>
        );
      }
    });

    return items;
  };

  const displayItems = getDisplayContent();
  const hasResources = displayItems.length > 0;

  // Get the currently selected company's rep IDs for the dialog
  const selectedCompanyData = selectedCompany 
    ? parsedResources.companies.find(c => c.companyId === selectedCompany.companyId)
    : null;

  // If readOnly, always show as non-editable text
  if (readOnly) {
    return (
      <span className={cn("text-[length:var(--schedule-font-size)] px-1 py-0.5 block text-black", className)}>
        {hasResources ? displayItems.map((item, i) => (
          <React.Fragment key={i}>
            {i > 0 && ", "}
            {item}
          </React.Fragment>
        )) : ""}
      </span>
    );
  }

  // Show selected resources with click to expand
  if (hasResources && !isEditing) {
    const firstItem = displayItems[0];
    const additionalCount = displayItems.length - 1;
    
    return (
      <>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span 
                className={cn("cursor-text hover:bg-muted rounded px-1 py-0.5 text-[length:var(--schedule-font-size)] flex items-center gap-1 whitespace-nowrap", className)}
                onClick={handleStartEdit}
              >
                <span className="truncate max-w-[100px]">{firstItem}</span>
                {additionalCount > 0 && (
                  <span className="bg-muted text-muted-foreground px-1 rounded text-[10px] flex-shrink-0 font-medium">
                    +{additionalCount}
                  </span>
                )}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <div className="flex flex-col gap-1">
                {displayItems.map((item, i) => (
                  <span key={i}>{item}</span>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {selectedCompany && (
          <CompanyResourcesDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            companyId={selectedCompany.companyId}
            companyName={selectedCompany.companyName}
            representatives={selectedCompany.representatives}
            selectedRepIds={selectedCompanyData?.selectedRepIds || []}
            onSave={handleSaveRepresentatives}
          />
        )}
      </>
    );
  }

  // Show "Select..." as plain text when no resources and not editing
  if (!isEditing) {
    return (
      <span 
        className={cn("cursor-text hover:bg-muted rounded px-1 py-0.5 text-[length:var(--schedule-font-size)] text-muted-foreground", className)}
        onClick={handleStartEdit}
        title="Click to select resources"
      >
        Select...
      </span>
    );
  }

  // Dropdown for selecting companies and internal users
  return (
    <div className={cn("relative", className)}>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="h-8 text-[length:var(--schedule-font-size)] justify-between"
          >
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span className="text-[length:var(--schedule-font-size)]">
                {hasResources ? `${displayItems.length} selected` : "Select..."}
              </span>
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0">
          <Command>
            <CommandInput placeholder="Search companies..." />
            <CommandList>
              <CommandEmpty>
                {isLoading ? "Loading..." : "No companies found."}
              </CommandEmpty>
              
              {/* Companies */}
              <CommandGroup heading="Companies">
                {companies.map((company) => {
                  const isSelected = parsedResources.companies.some(c => c.companyId === company.companyId);
                  const repCount = company.representatives.filter(r => r.receiveScheduleNotifications).length;
                  
                  return (
                    <CommandItem
                      key={company.companyId}
                      value={company.companyName}
                      onSelect={() => handleSelectCompany(company)}
                    >
                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                        <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{company.companyName}</div>
                          <div className="text-xs text-muted-foreground">
                            {company.representatives.length} reps
                            {repCount > 0 && ` (${repCount} will be notified)`}
                          </div>
                        </div>
                        <Check
                          className={cn(
                            "h-4 w-4 flex-shrink-0",
                            isSelected ? "opacity-100" : "opacity-0"
                          )}
                        />
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>

              {/* Internal Users */}
              <CommandGroup heading="Internal Users">
                {internalUsers.map((user) => {
                  const isSelected = parsedResources.internalUsers.includes(user.resourceId);
                  
                  return (
                    <CommandItem
                      key={user.resourceId}
                      value={user.resourceName}
                      onSelect={() => handleSelectInternalUser(user.resourceId, user.resourceName)}
                    >
                      <div className="flex items-center space-x-2 flex-1">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <div className="font-medium">{user.resourceName}</div>
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
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedCompany && (
        <CompanyResourcesDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          companyId={selectedCompany.companyId}
          companyName={selectedCompany.companyName}
          representatives={selectedCompany.representatives}
          selectedRepIds={selectedCompanyData?.selectedRepIds || []}
          onSave={handleSaveRepresentatives}
        />
      )}
    </div>
  );
}
