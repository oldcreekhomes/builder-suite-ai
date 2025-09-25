import { useState, useEffect } from 'react';
import { useMasterChatRealtime, UnreadCounts } from './useMasterChatRealtime';

/**
 * Simplified wrapper hook for unread counts that uses the master realtime system
 */
export const useUnreadCountsSimplified = (userIds: string[]) => {
  const [isLoading, setIsLoading] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState<UnreadCounts>({});
  
  const { unreadCounts: masterUnreadCounts, fetchUnreadCounts, markConversationAsRead } = useMasterChatRealtime(null, {}, {
    enableNotifications: false // Don't duplicate notifications - let the main Messages component handle them
  });

  // Update local state when master counts change
  useEffect(() => {
    setUnreadCounts(masterUnreadCounts);
  }, [masterUnreadCounts]);

  // Listen for unread count changes from custom events
  useEffect(() => {
    const handleUnreadCountChange = (event: CustomEvent) => {
      const { userId, count } = event.detail;
      setUnreadCounts(prev => ({
        ...prev,
        [userId]: count
      }));
    };

    window.addEventListener('unread-count-changed', handleUnreadCountChange as EventListener);
    
    return () => {
      window.removeEventListener('unread-count-changed', handleUnreadCountChange as EventListener);
    };
  }, []);

  // Fetch initial unread counts when userIds change
  useEffect(() => {
    if (userIds.length > 0) {
      setIsLoading(true);
      fetchUnreadCounts(userIds).finally(() => setIsLoading(false));
    }
  }, [userIds.join(','), fetchUnreadCounts]);

  // Filter unread counts to only include the requested userIds
  const filteredUnreadCounts: UnreadCounts = {};
  userIds.forEach(userId => {
    filteredUnreadCounts[userId] = unreadCounts[userId] || 0;
  });

  return {
    unreadCounts: filteredUnreadCounts,
    isLoading,
    markConversationAsRead,
    refreshCounts: () => fetchUnreadCounts(userIds)
  };
};