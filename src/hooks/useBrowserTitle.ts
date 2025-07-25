import { useEffect } from 'react';
import { useCompanyUsers } from '@/hooks/useCompanyUsers';
import { useUnreadCounts } from '@/hooks/useUnreadCounts';

export const useBrowserTitle = () => {
  const { users } = useCompanyUsers();
  const userIds = users?.map(user => user.id) || [];
  const { unreadCounts } = useUnreadCounts(userIds);
  
  // Calculate total unread count
  const totalUnread = Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);

  useEffect(() => {
    const baseTitle = 'BuilderSuite AI';
    
    if (totalUnread > 0) {
      document.title = `(${totalUnread}) ${baseTitle}`;
    } else {
      document.title = baseTitle;
    }
  }, [totalUnread]);

  return totalUnread;
};