import React, { useState, useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { X, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProjectTask } from "@/hooks/useProjectTasks";
import { toast } from "sonner";
import { 
  parsePredecessors, 
  validatePredecessors, 
  formatPredecessorForDisplay,
  ParsedPredecessor
} from "@/utils/predecessorValidation";
// Fixed component after removing selectedPredecessors reference

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
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState<string>("");
  const [validationResult, setValidationResult] = useState({ isValid: true, errors: [], warnings: [] });
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize input value from props
  useEffect(() => {
    if (!isEditing) {
      setInputValue(value.join(', '));
    }
  }, [value, isEditing]);

  // Validate predecessors whenever input changes
  useEffect(() => {
    if (inputValue.trim()) {
      const predecessors = inputValue.split(',').map(p => p.trim()).filter(p => p);
      const result = validatePredecessors(currentTaskId, predecessors, allTasks);
      setValidationResult(result);
    } else {
      setValidationResult({ isValid: true, errors: [], warnings: [] });
    }
  }, [inputValue, currentTaskId, allTasks]);

  const handleStartEdit = () => {
    setIsEditing(true);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  const handleFinishEdit = () => {
    setIsEditing(false);
    
    // Parse and save the input
    const predecessors = inputValue.split(',').map(p => p.trim()).filter(p => p);
    
    // Show validation errors as toast
    if (inputValue.trim()) {
      const result = validatePredecessors(currentTaskId, predecessors, allTasks);
      if (!result.isValid) {
        toast.error("Predecessor Validation Error", {
          description: result.errors.join("; ")
        });
      }
    }
    
    onValueChange(predecessors);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleFinishEdit();
    } else if (e.key === 'Escape') {
      setInputValue(value.join(', '));
      setIsEditing(false);
    }
  };

  const handleRemove = (predecessorToRemove: string) => {
    const newPredecessors = value.filter(p => p !== predecessorToRemove);
    onValueChange(newPredecessors);
  };

  const getParsedPredecessors = (): ParsedPredecessor[] => {
    return parsePredecessors(value, allTasks);
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
  if (value.length > 0 && !isEditing) {
    const parsed = getParsedPredecessors();
    return (
      <div 
        className={cn(
          "cursor-text hover:bg-muted rounded px-1 py-0.5 text-xs flex flex-wrap gap-1 min-h-[20px]",
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
            className="text-xs h-4 px-1 flex items-center gap-1"
          >
            {formatPredecessorForDisplay(pred)}
            <X 
              className="h-3 w-3 cursor-pointer hover:text-destructive" 
              onClick={(e) => {
                e.stopPropagation();
                handleRemove(value[index]);
              }}
            />
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
        className={cn("cursor-text hover:bg-muted rounded px-1 py-0.5 text-xs text-muted-foreground min-h-[20px] block", className)}
        onClick={handleStartEdit}
        title="Click to enter predecessors (e.g., 1.1, 1.2+5d)"
      >
        None
      </span>
    );
  }

  // Show the input when editing
  return (
    <div className={cn("relative", className)}>
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onBlur={handleFinishEdit}
        className={cn(
          "bg-transparent border-none outline-none text-xs w-full p-0",
          "focus:ring-0 focus:border-none",
          errorBorderClass,
          className
        )}
        style={{
          caretColor: "black",
          fontSize: "inherit",
          fontFamily: "inherit",
        }}
      />
    </div>
  );
}