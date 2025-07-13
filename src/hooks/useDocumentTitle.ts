import { useEffect } from 'react';
import { useChatNotifications } from './useChatNotifications';

const BASE_TITLE = 'BuilderSuite AI - Construction Management Platform';

export function useDocumentTitle() {
  const { totalUnread } = useChatNotifications();

  useEffect(() => {
    if (totalUnread > 0) {
      document.title = `(${totalUnread}) ${BASE_TITLE}`;
    } else {
      document.title = BASE_TITLE;
    }
  }, [totalUnread]);

  return { totalUnread };
}