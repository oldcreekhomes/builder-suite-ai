import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { X, Search } from "lucide-react";
import { ProjectTask } from "@/hooks/useProjectTasks";
import { cn } from "@/lib/utils";
import { parsePredecessorString, LinkType } from "@/utils/predecessorValidation";

interface PredecessorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTaskId: string;
  currentTaskHierarchy: string | null;
  allTasks: ProjectTask[];
  currentPredecessors: string[];
  onSave: (predecessors: string[]) => void;
}

type RelationshipType = 'FS' | 'SS' | 'SF' | 'FF';

interface RelationshipOption {
  value: RelationshipType;
  label: string;
  description: string;
}

const relationshipOptions: RelationshipOption[] = [
  {
    value: 'FS',
    label: "Finish to Start",
    description: "Can't start until that task finishes"
  },
  {
    value: 'SS',
    label: "Start to Start",
    description: "Should start when that task starts"
  },
  {
    value: 'SF',
    label: "Start to Finish",
    description: "Must be ready/finished BEFORE that task starts"
  },
  {
    value: 'FF',
    label: "Finish to Finish",
    description: "Should finish when that task finishes"
  }
];

export function PredecessorDialog({
  open,
  onOpenChange,
  currentTaskId,
  currentTaskHierarchy,
  allTasks,
  currentPredecessors,
  onSave
}: PredecessorDialogProps) {
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const [relationship, setRelationship] = useState<RelationshipType>("FS");
  const [lagDays, setLagDays] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [predecessors, setPredecessors] = useState<string[]>(currentPredecessors);
  const [showDropdown, setShowDropdown] = useState(false);

  // Reset state when dialog opens
  React.useEffect(() => {
    if (open) {
      setPredecessors(currentPredecessors);
      setSelectedTaskId("");
      setRelationship("FS");
      setLagDays("");
      setSearchQuery("");
    }
  }, [open, currentPredecessors]);

  // Filter available tasks (exclude current task and its children)
  const availableTasks = useMemo(() => {
    return allTasks.filter(task => {
      // Exclude current task
      if (task.id === currentTaskId) return false;
      // Exclude children of current task
      if (currentTaskHierarchy && task.hierarchy_number?.startsWith(currentTaskHierarchy + '.')) return false;
      // Apply search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          task.hierarchy_number?.toLowerCase().includes(query) ||
          task.task_name.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [allTasks, currentTaskId, currentTaskHierarchy, searchQuery]);

  // Generate predecessor string from selections
  const generatePredecessorString = (): string => {
    if (!selectedTaskId) return "";
    
    const task = allTasks.find(t => t.id === selectedTaskId);
    if (!task?.hierarchy_number) return "";
    
    let result = task.hierarchy_number;
    
    // Add relationship suffix (FS is default, no suffix needed)
    if (relationship !== 'FS') {
      result += relationship;
    }
    
    // Add lag/lead days
    const lagNum = parseInt(lagDays) || 0;
    if (lagNum > 0) {
      result += `+${lagNum}d`;
    } else if (lagNum < 0) {
      result += `${lagNum}d`;
    }
    
    return result;
  };

  const handleAddPredecessor = () => {
    const predString = generatePredecessorString();
    if (predString && !predecessors.includes(predString)) {
      // Check if we already have this task (with different relationship)
      const task = allTasks.find(t => t.id === selectedTaskId);
      const existingIndex = predecessors.findIndex(p => {
        const parsed = parsePredecessorString(p);
        return parsed?.taskId === task?.hierarchy_number;
      });
      
      if (existingIndex >= 0) {
        // Replace existing
        const newPreds = [...predecessors];
        newPreds[existingIndex] = predString;
        setPredecessors(newPreds);
      } else {
        setPredecessors([...predecessors, predString]);
      }
      
      // Reset selection
      setSelectedTaskId("");
      setRelationship("FS");
      setLagDays("");
    }
  };

  const handleRemovePredecessor = (pred: string) => {
    setPredecessors(predecessors.filter(p => p !== pred));
  };

  const handleSave = () => {
    // Auto-add current selection if there is one
    let finalPredecessors = [...predecessors];
    
    if (selectedTaskId) {
      const predString = generatePredecessorString();
      if (predString && !finalPredecessors.includes(predString)) {
        const task = allTasks.find(t => t.id === selectedTaskId);
        const existingIndex = finalPredecessors.findIndex(p => {
          const parsed = parsePredecessorString(p);
          return parsed?.taskId === task?.hierarchy_number;
        });
        
        if (existingIndex >= 0) {
          finalPredecessors[existingIndex] = predString;
        } else {
          finalPredecessors.push(predString);
        }
      }
    }
    
    onSave(finalPredecessors);
    onOpenChange(false);
  };

  const getPredecessorDisplay = (pred: string) => {
    const parsed = parsePredecessorString(pred);
    if (!parsed) return pred;
    
    const task = allTasks.find(t => t.hierarchy_number === parsed.taskId);
    const taskName = task ? task.task_name : "Unknown task";
    
    let display = `${parsed.taskId}: ${taskName}`;
    if (parsed.linkType !== 'FS') {
      display += ` (${parsed.linkType})`;
    }
    if (parsed.lagDays !== 0) {
      display += parsed.lagDays > 0 ? ` +${parsed.lagDays}d` : ` ${parsed.lagDays}d`;
    }
    
    return display;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Add Predecessor Relationship</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto space-y-6 py-4">
          {/* Current Predecessors */}
          {predecessors.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Current Predecessors</Label>
              <div className="flex flex-wrap gap-2">
                {predecessors.map((pred, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1 py-1">
                    <span className="text-xs">{getPredecessorDisplay(pred)}</span>
                    <button
                      onClick={() => handleRemovePredecessor(pred)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Task Selector */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">1. Which task does this depend on?</Label>
            <div className="relative px-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tasks..."
                value={selectedTaskId ? (() => {
                  const task = allTasks.find(t => t.id === selectedTaskId);
                  return task ? `${task.hierarchy_number} - ${task.task_name}` : searchQuery;
                })() : searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSelectedTaskId("");
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                className="pl-9"
              />
              {showDropdown && searchQuery && !selectedTaskId && (
                <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg">
                  <ScrollArea className="h-40">
                    <div className="p-2 space-y-1">
                      {availableTasks.map((task) => (
                        <button
                          key={task.id}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setSelectedTaskId(task.id);
                            setSearchQuery("");
                            setShowDropdown(false);
                          }}
                          className={cn(
                            "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                            selectedTaskId === task.id
                              ? "bg-primary text-primary-foreground"
                              : "hover:bg-muted"
                          )}
                        >
                          <span className="font-medium">{task.hierarchy_number}</span>
                          <span className="mx-2">-</span>
                          <span>{task.task_name}</span>
                        </button>
                      ))}
                      {availableTasks.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No tasks found
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          </div>

          {/* Relationship Type */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">2. What's the relationship?</Label>
            <RadioGroup
              value={relationship}
              onValueChange={(value) => setRelationship(value as RelationshipType)}
              className="grid grid-cols-1 gap-2"
            >
              {relationshipOptions.map((option) => (
                <div
                  key={option.value}
                  className={cn(
                    "flex items-center space-x-3 border rounded-lg p-3 cursor-pointer transition-colors",
                    relationship === option.value
                      ? "border-primary bg-primary/5"
                      : "hover:bg-muted/50"
                  )}
                  onClick={() => setRelationship(option.value)}
                >
                  <RadioGroupItem value={option.value} id={option.value} />
                  <label
                    htmlFor={option.value}
                    className="font-medium cursor-pointer"
                  >
                    {option.description}
                  </label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Lag Days */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">3. Any delay or lead time?</Label>
            <div className="flex items-center gap-3 px-1">
              <Input
                type="number"
                value={lagDays}
                onChange={(e) => setLagDays(e.target.value)}
                className="w-24"
                placeholder="0"
              />
              <span className="text-sm text-muted-foreground">
                days {parseInt(lagDays) > 0 ? "(delay/gap)" : parseInt(lagDays) < 0 ? "(overlap/lead)" : ""}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Positive = wait extra days, Negative = overlap/start earlier
            </p>
          </div>

        </div>

        <DialogFooter className="flex-shrink-0 gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
