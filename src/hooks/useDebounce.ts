import { useCallback, useRef } from 'react';

interface DebounceOptions {
  immediate?: boolean;
  maxWait?: number;
}

export function useDebounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number,
  options: DebounceOptions = {}
): T {
  const timeoutRef = useRef<NodeJS.Timeout>();
  const maxTimeoutRef = useRef<NodeJS.Timeout>();
  const lastCallTimeRef = useRef<number>(0);
  const { immediate = false, maxWait } = options;

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      const timeSinceLastCall = now - lastCallTimeRef.current;

      const executeFunction = () => {
        lastCallTimeRef.current = now;
        if (maxTimeoutRef.current) {
          clearTimeout(maxTimeoutRef.current);
          maxTimeoutRef.current = undefined;
        }
        func(...args);
      };

      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Execute immediately if requested and it's the first call
      if (immediate && timeSinceLastCall > delay) {
        executeFunction();
        return;
      }

      // Set up max wait timeout if specified
      if (maxWait && !maxTimeoutRef.current && timeSinceLastCall < maxWait) {
        maxTimeoutRef.current = setTimeout(executeFunction, maxWait - timeSinceLastCall);
      }

      // Set up regular debounce timeout
      timeoutRef.current = setTimeout(executeFunction, delay);
    },
    [func, delay, immediate, maxWait]
  );

  // Cleanup on unmount
  const cleanup = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (maxTimeoutRef.current) {
      clearTimeout(maxTimeoutRef.current);
    }
  }, []);

  return Object.assign(debouncedCallback as T, { cleanup });
}