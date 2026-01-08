import { useCallback, useEffect, useRef, useState } from "react";
import { useBlocker } from "react-router-dom";

interface UseUnsavedChangesOptions {
  /**
   * Function that returns true if there are unsaved changes
   */
  hasChanges: () => boolean;
  /**
   * Optional callback when save is requested from the dialog
   */
  onSave?: () => Promise<void>;
}

interface UseUnsavedChangesReturn {
  /**
   * Whether the unsaved changes dialog should be shown
   */
  showDialog: boolean;
  /**
   * Call this to proceed with navigation (discard changes)
   */
  confirmLeave: () => void;
  /**
   * Call this to cancel navigation (stay on page)
   */
  cancelLeave: () => void;
  /**
   * Call this after saving to proceed with navigation
   */
  saveAndLeave: () => Promise<void>;
  /**
   * Whether a save operation is in progress
   */
  isSaving: boolean;
  /**
   * Mark the form as having no unsaved changes (call after successful save)
   */
  markAsSaved: () => void;
}

export function useUnsavedChanges({
  hasChanges,
  onSave,
}: UseUnsavedChangesOptions): UseUnsavedChangesReturn {
  const [isSaving, setIsSaving] = useState(false);
  const hasChangesRef = useRef(hasChanges);
  
  // Keep ref updated
  useEffect(() => {
    hasChangesRef.current = hasChanges;
  }, [hasChanges]);

  // Block navigation when there are unsaved changes
  const blocker = useBlocker(
    useCallback(
      ({ currentLocation, nextLocation }) => {
        return (
          hasChangesRef.current() &&
          currentLocation.pathname !== nextLocation.pathname
        );
      },
      []
    )
  );

  // Handle browser back/forward and tab close
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChangesRef.current()) {
        e.preventDefault();
        e.returnValue = "";
        return "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  const confirmLeave = useCallback(() => {
    if (blocker.state === "blocked") {
      blocker.proceed();
    }
  }, [blocker]);

  const cancelLeave = useCallback(() => {
    if (blocker.state === "blocked") {
      blocker.reset();
    }
  }, [blocker]);

  const saveAndLeave = useCallback(async () => {
    if (!onSave) {
      confirmLeave();
      return;
    }

    setIsSaving(true);
    try {
      await onSave();
      // After successful save, proceed with navigation
      if (blocker.state === "blocked") {
        blocker.proceed();
      }
    } catch (error) {
      // If save fails, stay on page
      console.error("Failed to save:", error);
    } finally {
      setIsSaving(false);
    }
  }, [onSave, blocker, confirmLeave]);

  const markAsSaved = useCallback(() => {
    // This is a no-op since we use the hasChanges function dynamically
    // The caller should update their state to make hasChanges() return false
  }, []);

  return {
    showDialog: blocker.state === "blocked",
    confirmLeave,
    cancelLeave,
    saveAndLeave,
    isSaving,
    markAsSaved,
  };
}
