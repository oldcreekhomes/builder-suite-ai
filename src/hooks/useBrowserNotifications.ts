import { useCallback } from 'react';

export const useBrowserNotifications = () => {
  const isSupported = typeof window !== 'undefined' && 'Notification' in window;

  const getPermission = useCallback((): NotificationPermission | 'unsupported' => {
    if (!isSupported) return 'unsupported';
    return Notification.permission;
  }, [isSupported]);

  const requestPermission = useCallback(async (): Promise<NotificationPermission | 'unsupported'> => {
    if (!isSupported) return 'unsupported';
    
    try {
      const permission = await Notification.requestPermission();
      return permission;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return 'denied';
    }
  }, [isSupported]);

  const showNotification = useCallback((
    title: string,
    options?: {
      body?: string;
      icon?: string;
      tag?: string;
      onClick?: () => void;
    }
  ) => {
    if (!isSupported || Notification.permission !== 'granted') {
      return null;
    }

    try {
      const notification = new Notification(title, {
        body: options?.body,
        icon: options?.icon || '/favicon.ico',
        tag: options?.tag,
      });

      if (options?.onClick) {
        notification.onclick = () => {
          window.focus();
          options.onClick?.();
          notification.close();
        };
      }

      // Auto-close after 5 seconds
      setTimeout(() => notification.close(), 5000);

      return notification;
    } catch (error) {
      console.error('Error showing notification:', error);
      return null;
    }
  }, [isSupported]);

  return {
    isSupported,
    permission: getPermission(),
    requestPermission,
    showNotification,
  };
};
