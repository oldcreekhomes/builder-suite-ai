import { useEffect } from 'react';
import { openFileViaRedirect } from '@/utils/fileOpenUtils';

interface FileKeyboardShortcutsProps {
  bucket: string;
  path: string;
  fileName: string;
  enabled?: boolean;
}

export function useFileKeyboardShortcuts({ bucket, path, fileName, enabled = true }: FileKeyboardShortcutsProps) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+Click equivalent - Ctrl+Enter to open in new tab
      if (event.ctrlKey && event.key === 'Enter') {
        event.preventDefault();
        openFileViaRedirect(bucket, path, fileName);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [bucket, path, fileName, enabled]);

  const handleClick = (event: React.MouseEvent) => {
    // Ctrl+Click to open in new tab
    if (event.ctrlKey) {
      event.preventDefault();
      openFileViaRedirect(bucket, path, fileName);
    }
  };

  return { handleClick };
}