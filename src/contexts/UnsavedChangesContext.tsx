import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";

interface FormRegistration {
  hasChanges: () => boolean;
  onSave: () => Promise<void>;
}

interface UnsavedChangesContextType {
  registerForm: (registration: FormRegistration) => void;
  unregisterForm: () => void;
  requestNavigation: (action: () => void) => boolean;
  confirmDiscard: () => void;
  confirmSave: () => Promise<void>;
  cancelNavigation: () => void;
  showDialog: boolean;
  isSaving: boolean;
}

const UnsavedChangesContext = createContext<UnsavedChangesContextType | null>(null);

export function useUnsavedChangesContext() {
  const context = useContext(UnsavedChangesContext);
  if (!context) {
    throw new Error("useUnsavedChangesContext must be used within UnsavedChangesProvider");
  }
  return context;
}

interface UnsavedChangesProviderProps {
  children: React.ReactNode;
}

export function UnsavedChangesProvider({ children }: UnsavedChangesProviderProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const pendingActionRef = useRef<(() => void) | null>(null);
  const formRegistrationRef = useRef<FormRegistration | null>(null);

  const registerForm = useCallback((registration: FormRegistration) => {
    formRegistrationRef.current = registration;
  }, []);

  const unregisterForm = useCallback(() => {
    formRegistrationRef.current = null;
  }, []);

  const requestNavigation = useCallback((action: () => void): boolean => {
    const registration = formRegistrationRef.current;
    
    // If no form registered or no changes, proceed immediately
    if (!registration || !registration.hasChanges()) {
      action();
      return true;
    }

    // Has unsaved changes - show dialog
    pendingActionRef.current = action;
    setShowDialog(true);
    return false;
  }, []);

  const confirmDiscard = useCallback(() => {
    setShowDialog(false);
    const action = pendingActionRef.current;
    pendingActionRef.current = null;
    if (action) {
      action();
    }
  }, []);

  const confirmSave = useCallback(async () => {
    const registration = formRegistrationRef.current;
    if (!registration) {
      confirmDiscard();
      return;
    }

    setIsSaving(true);
    try {
      await registration.onSave();
      setShowDialog(false);
      const action = pendingActionRef.current;
      pendingActionRef.current = null;
      if (action) {
        action();
      }
    } catch (error) {
      console.error("Failed to save:", error);
      // Stay on dialog if save fails
    } finally {
      setIsSaving(false);
    }
  }, [confirmDiscard]);

  const cancelNavigation = useCallback(() => {
    setShowDialog(false);
    pendingActionRef.current = null;
  }, []);

  // Handle browser beforeunload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const registration = formRegistrationRef.current;
      if (registration && registration.hasChanges()) {
        e.preventDefault();
        e.returnValue = "";
        return "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  return (
    <UnsavedChangesContext.Provider
      value={{
        registerForm,
        unregisterForm,
        requestNavigation,
        confirmDiscard,
        confirmSave,
        cancelNavigation,
        showDialog,
        isSaving,
      }}
    >
      {children}
    </UnsavedChangesContext.Provider>
  );
}
