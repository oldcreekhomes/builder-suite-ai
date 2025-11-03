// Centralized notification engine that handles:
// - Message deduplication
// - Multi-tab coordination (only leader plays sound)
// - Audio management
// - Toast notifications
// - User preferences

import { audioManager } from './audioManager';
import { tabLeader } from './tabLeader';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface NotificationMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  isActiveConversation: boolean;
  timestamp: number;
}

interface NotificationPreferences {
  soundEnabled: boolean;
  toastEnabled: boolean;
}

class NotificationEngine {
  private seenMessageIds = new Set<string>();
  private lastCleanup = Date.now();
  private readonly CLEANUP_INTERVAL = 60000; // Clean up seen IDs every minute
  private readonly SEEN_MESSAGE_TTL = 300000; // Keep IDs for 5 minutes
  private preferences: NotificationPreferences = {
    soundEnabled: true,
    toastEnabled: true,
  };

  constructor() {
    this.loadPreferences();
    
    // Cleanup old message IDs periodically
    setInterval(() => this.cleanup(), this.CLEANUP_INTERVAL);
  }

  private async loadPreferences() {
    // For now, use localStorage for preferences
    // Can be extended to use a database table later
    try {
      const stored = localStorage.getItem('chat_notification_prefs');
      if (stored) {
        const prefs = JSON.parse(stored);
        this.preferences = { ...this.preferences, ...prefs };
      }
    } catch (error) {
      console.warn('📢 NotificationEngine: Failed to load preferences, using defaults', error);
    }
  }

  private cleanup() {
    const now = Date.now();
    if (now - this.lastCleanup > this.CLEANUP_INTERVAL) {
      console.log('📢 NotificationEngine: Cleaning up seen message IDs');
      this.seenMessageIds.clear();
      this.lastCleanup = now;
    }
  }

  public async notifyNewMessage(message: NotificationMessage): Promise<void> {
    // Deduplicate
    if (this.seenMessageIds.has(message.id)) {
      console.log('📢 NotificationEngine: Duplicate message, skipping', message.id);
      return;
    }

    this.seenMessageIds.add(message.id);
    console.log('📢 NotificationEngine: Processing new message', {
      id: message.id,
      sender: message.senderName,
      isActive: message.isActiveConversation,
      isLeader: tabLeader.getIsLeader(),
    });

    // Only show notifications if not the active conversation
    if (message.isActiveConversation) {
      console.log('📢 NotificationEngine: Active conversation, skipping notification');
      return;
    }

    // Play sound only if this tab is the leader and sound is enabled
    if (tabLeader.getIsLeader() && this.preferences.soundEnabled) {
      console.log('📢 NotificationEngine: Playing sound (leader tab)');
      const soundPlayed = await audioManager.playNotificationSound();
      if (!soundPlayed) {
        console.warn('📢 NotificationEngine: Sound failed to play - audio may not be unlocked');
      }
    } else {
      console.log('📢 NotificationEngine: Skipping sound', {
        isLeader: tabLeader.getIsLeader(),
        soundEnabled: this.preferences.soundEnabled,
      });
    }

    // Show toast only from leader tab to avoid duplicates
    if (tabLeader.getIsLeader() && this.preferences.toastEnabled) {
      console.log('📢 NotificationEngine: Showing toast (leader tab)');
      toast({
        title: `New message from ${message.senderName}`,
        description: message.content.substring(0, 100) + (message.content.length > 100 ? '...' : ''),
        duration: 4000,
      });
    }
  }

  public setPreferences(prefs: Partial<NotificationPreferences>) {
    this.preferences = { ...this.preferences, ...prefs };
    try {
      localStorage.setItem('chat_notification_prefs', JSON.stringify(this.preferences));
    } catch (error) {
      console.warn('📢 NotificationEngine: Failed to save preferences', error);
    }
    console.log('📢 NotificationEngine: Preferences updated', this.preferences);
  }

  public getPreferences(): NotificationPreferences {
    return { ...this.preferences };
  }

  public clearSeenMessages() {
    this.seenMessageIds.clear();
    console.log('📢 NotificationEngine: Cleared seen message IDs');
  }
}

// Singleton instance
export const notificationEngine = new NotificationEngine();
