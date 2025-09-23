import { useState, useEffect } from 'react';
import { useMasterChatRealtime, UnreadCounts } from './useMasterChatRealtime';

/**
 * Simplified wrapper hook for unread counts that uses the master realtime system
 */
export const useUnreadCountsSimplified = (userIds: string[]) => {
  const [isLoading, setIsLoading] = useState(false);
  
  const { unreadCounts, fetchUnreadCounts, markConversationAsRead } = useMasterChatRealtime(null, {});

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