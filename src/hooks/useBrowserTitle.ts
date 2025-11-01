import { useEffect } from 'react';

/**
 * Hook to update the browser title with unread message count
 * Note: This hook is currently a placeholder. The actual unread count
 * is managed by FloatingChatManager and displayed in the sidebar.
 * Browser title updates should be added when we integrate with the global state.
 */
export const useBrowserTitle = () => {
  useEffect(() => {
    const baseTitle = 'BuilderSuite AI';
    document.title = baseTitle;
  }, []);

  return 0;
};
