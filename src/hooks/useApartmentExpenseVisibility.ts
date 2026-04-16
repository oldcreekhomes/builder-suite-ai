import { useEffect, useState, useCallback } from "react";

const EVENT_NAME = "apartment-expenses-changed";

function getStorageKey(projectId?: string) {
  return `apartment-visible-expenses-${projectId || "default"}`;
}

function read(projectId?: string): string[] | null {
  try {
    const raw = localStorage.getItem(getStorageKey(projectId));
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

export function notifyApartmentExpensesChanged() {
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
}

/**
 * Reads the same localStorage key as ApartmentInputs.tsx so other pages
 * (e.g. Income Statement) can react to row visibility toggles in real time.
 *
 * If no entry exists yet, returns null for visibleFields meaning "all visible"
 * (matches the default in ApartmentInputs.loadVisibleExpenses).
 */
export function useApartmentExpenseVisibility(projectId?: string) {
  const [fields, setFields] = useState<string[] | null>(() => read(projectId));

  useEffect(() => {
    const refresh = () => setFields(read(projectId));
    refresh();
    const onStorage = (e: StorageEvent) => {
      if (!e.key || e.key === getStorageKey(projectId)) refresh();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(EVENT_NAME, refresh);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(EVENT_NAME, refresh);
    };
  }, [projectId]);

  const isVisible = useCallback(
    (field: string) => (fields === null ? true : fields.includes(field)),
    [fields]
  );

  return { visibleFields: fields, isVisible };
}
