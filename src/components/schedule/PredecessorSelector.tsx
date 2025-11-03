import React, { useState, useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { X, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProjectTask } from "@/hooks/useProjectTasks";
import { useToast } from "@/hooks/use-toast";
import { 
  parsePredecessors, 
  validatePredecessors, 
  formatPredecessorForDisplay,
  ParsedPredecessor
} from "@/utils/predecessorValidation";
// Fixed component after removing selectedPredecessors reference

interface PredecessorSelectorProps {
  value: string[] | string | null | undefined;
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
  const { toast } = useToast();

  // Helper function to safely convert value to string array
  const valueToArray = (val: any): string[] => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') return [val];
    return [];
  };

  // Get the current value as a safe array
  const safeValue = valueToArray(value);

  // Initialize input value from props
  useEffect(() => {
    if (!isEditing) {
      setInputValue(safeValue.join(', '));
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
    
    // Parse and validate the input
    const predecessors = inputValue.split(',').map(p => p.trim()).filter(p => p);
    
    // Show validation errors as toast and reject invalid input
    if (inputValue.trim()) {
      const result = validatePredecessors(currentTaskId, predecessors, allTasks);
      if (!result.isValid) {
        toast({
          title: "Predecessor Validation Error",
          description: result.errors.join("; "),
          variant: "destructive"
        });
        // Reject invalid input - reset to original value and don't call onValueChange
        setInputValue(safeValue.join(', '));
        return;
      }
    }
    
    // Only save if validation passed
    onValueChange(predecessors);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleFinishEdit();
    } else if (e.key === 'Escape') {
      setInputValue(safeValue.join(', '));
      setIsEditing(false);
    }
  };

  const handleRemove = (predecessorToRemove: string) => {
    const newPredecessors = safeValue.filter(p => p !== predecessorToRemove);
    onValueChange(newPredecessors);
  };

  const getParsedPredecessors = (): ParsedPredecessor[] => {
    return parsePredecessors(safeValue, allTasks);
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

  // Always show selected predecessors as chips when not editing and has predecessors
  if (safeValue.length > 0 && !isEditing) {
    const parsed = getParsedPredecessors();
    return (
      <div 
        className={cn(
          "cursor-text hover:bg-muted rounded px-1 py-0.5 text-xs flex flex-wrap gap-1 min-h-[20px]",
          className
        )}
        onClick={handleStartEdit}
        title="Click to edit predecessors"
      >
        {parsed.map((pred, index) => (
          <span key={index} className="text-xs">
            {pred.taskId}
            {index < parsed.length - 1 ? ', ' : ''}
          </span>
        ))}
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