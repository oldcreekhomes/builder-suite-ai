import React, { useState, useEffect } from "react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Check, ChevronsUpDown, X, Plus, GitBranch, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProjectTask } from "@/hooks/useProjectTasks";
import { 
  parsePredecessors, 
  validatePredecessors, 
  formatPredecessorForDisplay,
  formatPredecessorForStorage,
  ParsedPredecessor
} from "@/utils/predecessorValidation";

interface PredecessorSelectorProps {
  value: string[];
  onValueChange: (value: string[]) => void;
  currentTaskId: string;
  allTasks: ProjectTask[];
  className?: string;
  readOnly?: boolean;
}

export function PredecessorSelector({ 
  value = [], 
  onValueChange, 
  currentTaskId,
  allTasks,
  className, 
  readOnly = false 
}: PredecessorSelectorProps) {
  const [open, setOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedPredecessors, setSelectedPredecessors] = useState<string[]>([]);
  const [lagDaysInput, setLagDaysInput] = useState<{ [key: string]: number }>({});
  const [validationResult, setValidationResult] = useState({ isValid: true, errors: [], warnings: [] });

  // Get current task to exclude from selection
  const currentTask = allTasks.find(t => t.id === currentTaskId);
  
  // Filter out current task and tasks that would create circular dependencies
  const availableTasks = allTasks.filter(task => 
    task.id !== currentTaskId && 
    task.hierarchy_number &&
    task.hierarchy_number !== currentTask?.hierarchy_number
  );

  // Parse current value into selected predecessors
  useEffect(() => {
    setSelectedPredecessors(value || []);
  }, [value]);

  // Validate predecessors whenever they change
  useEffect(() => {
    if (selectedPredecessors.length > 0) {
      const result = validatePredecessors(currentTaskId, selectedPredecessors, allTasks);
      setValidationResult(result);
    } else {
      setValidationResult({ isValid: true, errors: [], warnings: [] });
    }
  }, [selectedPredecessors, currentTaskId, allTasks]);

  const handleSelect = (taskHierarchy: string) => {
    const lagDays = lagDaysInput[taskHierarchy] || 0;
    const predecessorString = formatPredecessorForStorage(taskHierarchy, lagDays);
    
    const newPredecessors = selectedPredecessors.includes(predecessorString)
      ? selectedPredecessors.filter(p => !p.startsWith(taskHierarchy))
      : [...selectedPredecessors.filter(p => !p.startsWith(taskHierarchy)), predecessorString];
    
    setSelectedPredecessors(newPredecessors);
    onValueChange(newPredecessors);
  };

  const handleRemove = (predecessorToRemove: string) => {
    const taskId = predecessorToRemove.split('+')[0];
    const newPredecessors = selectedPredecessors.filter(p => !p.startsWith(taskId));
    setSelectedPredecessors(newPredecessors);
    onValueChange(newPredecessors);
    
    // Clean up lag days input
    const newLagDays = { ...lagDaysInput };
    delete newLagDays[taskId];
    setLagDaysInput(newLagDays);
  };

  const handleLagDaysChange = (taskHierarchy: string, lagDays: number) => {
    setLagDaysInput(prev => ({
      ...prev,
      [taskHierarchy]: Math.max(0, lagDays)
    }));

    // Update the predecessor with new lag days
    const newPredecessors = selectedPredecessors.map(pred => {
      const predTaskId = pred.split('+')[0];
      if (predTaskId === taskHierarchy) {
        return formatPredecessorForStorage(taskHierarchy, Math.max(0, lagDays));
      }
      return pred;
    });
    
    setSelectedPredecessors(newPredecessors);
    onValueChange(newPredecessors);
  };

  const getDisplayText = () => {
    if (selectedPredecessors.length === 0) return "None";
    if (selectedPredecessors.length === 1) {
      const parsed = parsePredecessors(selectedPredecessors, allTasks);
      return parsed[0]?.taskId || "Invalid";
    }
    return `${selectedPredecessors.length} selected`;
  };

  const getParsedPredecessors = (): ParsedPredecessor[] => {
    return parsePredecessors(selectedPredecessors, allTasks);
  };

  const isTaskSelected = (taskHierarchy: string): boolean => {
    return selectedPredecessors.some(pred => pred.startsWith(taskHierarchy));
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
    const parsed = getParsedPredecessors();
    return (
      <span className={cn("text-xs px-1 py-0.5 block text-black", className)}>
        {parsed.length > 0 ? parsed.map(p => p.taskId).join(', ') : "None"}
      </span>
    );
  }

  // Show validation errors
  const hasErrors = !validationResult.isValid;
  const errorBorderClass = hasErrors ? "border-destructive bg-destructive/10" : "";

  // Always show selected predecessors as chips when not editing and has predecessors
  if (selectedPredecessors.length > 0 && !isEditing) {
    const parsed = getParsedPredecessors();
    return (
      <div 
        className={cn(
          "cursor-text hover:bg-muted rounded px-1 py-0.5 text-xs flex flex-wrap gap-1",
          errorBorderClass,
          className
        )}
        onClick={handleStartEdit}
        title={hasErrors ? validationResult.errors.join('; ') : "Click to edit predecessors"}
      >
        {parsed.map((pred, index) => (
          <Badge 
            key={index} 
            variant={pred.isValid ? "secondary" : "destructive"} 
            className="text-xs h-4 px-1"
          >
            {pred.taskId}{pred.lagDays > 0 && `+${pred.lagDays}d`}
          </Badge>
        ))}
        {hasErrors && (
          <AlertTriangle className="h-3 w-3 text-destructive ml-1" />
        )}
      </div>
    );
  }

  // Show "None" as plain text when no predecessors and not editing
  if (!isEditing) {
    return (
      <span 
        className={cn("cursor-text hover:bg-muted rounded px-1 py-0.5 text-xs text-muted-foreground", className)}
        onClick={handleStartEdit}
        title="Click to select predecessors"
      >
        None
      </span>
    );
  }

  // Show the dropdown when editing
  return (
    <div className={cn("relative", className)}>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn("h-8 text-xs justify-between", errorBorderClass)}
          >
            <div className="flex items-center gap-2">
              <GitBranch className="h-4 w-4" />
              <span className="text-xs">
                {getDisplayText()}
              </span>
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0 bg-background border shadow-md z-50" onEscapeKeyDown={handleFinishEdit}>
          <Command className="bg-background">
            <CommandInput placeholder="Search tasks..." onKeyDown={(e) => {
              if (e.key === 'Escape') {
                handleFinishEdit();
              }
            }} />
            <CommandList>
              <CommandEmpty>No tasks found.</CommandEmpty>
              
              <CommandGroup heading="Available Tasks">
                {availableTasks.map((task) => {
                  const isSelected = isTaskSelected(task.hierarchy_number!);
                  const currentLagDays = lagDaysInput[task.hierarchy_number!] || 0;
                  
                  return (
                    <CommandItem
                      key={task.id}
                      value={`${task.hierarchy_number}: ${task.task_name}`}
                      onSelect={() => handleSelect(task.hierarchy_number!)}
                      className="flex items-center justify-between p-2"
                    >
                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                        <Check
                          className={cn(
                            "h-4 w-4 flex-shrink-0",
                            isSelected ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="font-medium truncate">
                          <span className="text-muted-foreground">{task.hierarchy_number}:</span>{" "}
                          <span>{task.task_name}</span>
                        </div>
                      </div>
                      
                      {isSelected && (
                        <div className="flex items-center gap-1 ml-2">
                          <span className="text-xs text-muted-foreground">Lag:</span>
                          <Input
                            type="number"
                            min="0"
                            value={currentLagDays}
                            onChange={(e) => handleLagDaysChange(task.hierarchy_number!, parseInt(e.target.value) || 0)}
                            className="w-16 h-6 text-xs"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <span className="text-xs text-muted-foreground">d</span>
                        </div>
                      )}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
          
          {/* Selected Predecessors Section */}
          {selectedPredecessors.length > 0 && (
            <div className="border-t p-2 bg-muted/50">
              <div className="text-xs font-medium text-muted-foreground mb-2">Selected:</div>
              <div className="flex flex-wrap gap-1">
                {getParsedPredecessors().map((pred, index) => (
                  <Badge 
                    key={index} 
                    variant={pred.isValid ? "secondary" : "destructive"}
                    className="text-xs h-6 px-2 flex items-center gap-1"
                  >
                    {formatPredecessorForDisplay(pred)}
                    <X 
                      className="h-3 w-3 cursor-pointer hover:text-destructive" 
                      onClick={() => handleRemove(selectedPredecessors[index])}
                    />
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          {/* Validation Errors */}
          {!validationResult.isValid && (
            <div className="border-t p-2 bg-destructive/10">
              <div className="flex items-center gap-1 text-xs text-destructive">
                <AlertTriangle className="h-3 w-3" />
                <span className="font-medium">Validation Errors:</span>
              </div>
              <ul className="text-xs text-destructive mt-1 list-disc list-inside">
                {validationResult.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Validation Warnings */}
          {validationResult.warnings.length > 0 && (
            <div className="border-t p-2 bg-orange-50">
              <div className="flex items-center gap-1 text-xs text-orange-600">
                <AlertTriangle className="h-3 w-3" />
                <span className="font-medium">Warnings:</span>
              </div>
              <ul className="text-xs text-orange-600 mt-1 list-disc list-inside">
                {validationResult.warnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}