import { useCallback, useEffect, useRef, useState } from "react";

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
    // No-op - navigation blocking removed since BrowserRouter doesn't support useBlocker
  }, []);

  const cancelLeave = useCallback(() => {
    // No-op - navigation blocking removed since BrowserRouter doesn't support useBlocker
  }, []);

  const saveAndLeave = useCallback(async () => {
    if (!onSave) {
      return;
    }

    setIsSaving(true);
    try {
      await onSave();
    } catch (error) {
      console.error("Failed to save:", error);
    } finally {
      setIsSaving(false);
    }
  }, [onSave]);

  const markAsSaved = useCallback(() => {
    // This is a no-op since we use the hasChanges function dynamically
    // The caller should update their state to make hasChanges() return false
  }, []);

  // Note: In-app navigation blocking requires a data router (createBrowserRouter).
  // Since this app uses BrowserRouter, we only handle browser-level navigation
  // (refresh, close tab) via beforeunload. For full in-app blocking, the app
  // would need to migrate to createBrowserRouter.

  return {
    showDialog: false, // Always false since we can't block without data router
    confirmLeave,
    cancelLeave,
    saveAndLeave,
    isSaving,
    markAsSaved,
  };
}
