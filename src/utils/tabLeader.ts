// Multi-tab coordination using BroadcastChannel with localStorage fallback
// Ensures only ONE tab plays notification sounds to prevent double beeps

type LeaderMessage = 
  | { type: 'heartbeat'; tabId: string; timestamp: number }
  | { type: 'claim-leadership'; tabId: string; timestamp: number }
  | { type: 'release-leadership'; tabId: string };

class TabLeader {
  private tabId: string;
  private isLeader = false;
  private channel: BroadcastChannel | null = null;
  private heartbeatInterval: number | null = null;
  private checkInterval: number | null = null;
  private lastLeaderHeartbeat = 0;
  private readonly HEARTBEAT_INTERVAL = 5000; // 5s
  private readonly LEADER_TIMEOUT = 15000; // 15s
  private readonly STORAGE_KEY = 'chat_tab_leader';
  private onLeadershipChange?: (isLeader: boolean) => void;

  constructor() {
    this.tabId = `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.init();
  }

  private init() {
    // Try BroadcastChannel first (modern browsers)
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this.channel = new BroadcastChannel('chat-leader-election');
        this.channel.onmessage = (event) => this.handleMessage(event.data);
        console.log('🎯 TabLeader: Using BroadcastChannel');
      } catch (error) {
        console.warn('🎯 TabLeader: BroadcastChannel failed, using localStorage', error);
        this.setupLocalStorageFallback();
      }
    } else {
      console.log('🎯 TabLeader: BroadcastChannel not supported, using localStorage');
      this.setupLocalStorageFallback();
    }

    // Try to become leader immediately if no one else is
    this.attemptLeadership();

    // Start heartbeat and leadership check
    this.startHeartbeat();
    this.startLeadershipCheck();

    // Handle tab close
    window.addEventListener('beforeunload', () => this.cleanup());
    
    // Handle visibility change - release leadership if hidden for too long
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.isLeader) {
        console.log('🎯 TabLeader: Tab hidden, releasing leadership');
        this.releaseLeadership();
      } else if (!document.hidden && !this.isLeader) {
        // Try to reclaim if we become visible and no leader exists
        setTimeout(() => this.attemptLeadership(), 1000);
      }
    });
  }

  private setupLocalStorageFallback() {
    // Use localStorage events for cross-tab communication
    window.addEventListener('storage', (e) => {
      if (e.key === this.STORAGE_KEY && e.newValue) {
        try {
          const data = JSON.parse(e.newValue);
          this.handleMessage(data);
        } catch (error) {
          console.warn('🎯 TabLeader: Failed to parse storage event', error);
        }
      }
    });
  }

  private handleMessage(message: LeaderMessage) {
    if (message.tabId === this.tabId) return; // Ignore own messages

    switch (message.type) {
      case 'heartbeat':
        if (this.isLeader && message.timestamp > this.lastLeaderHeartbeat) {
          // Another tab claims to be leader with newer timestamp, step down
          console.log('🎯 TabLeader: Stepping down, newer leader detected');
          this.isLeader = false;
          this.notifyLeadershipChange();
        } else if (!this.isLeader) {
          this.lastLeaderHeartbeat = message.timestamp;
        }
        break;

      case 'claim-leadership':
        if (this.isLeader && message.timestamp > Date.now()) {
          // Another tab is claiming with future timestamp (shouldn't happen but handle it)
          console.log('🎯 TabLeader: Another tab claiming leadership');
        }
        break;

      case 'release-leadership':
        if (!this.isLeader) {
          // Leader released, try to claim
          setTimeout(() => this.attemptLeadership(), 100);
        }
        break;
    }
  }

  private broadcast(message: LeaderMessage) {
    if (this.channel) {
      try {
        this.channel.postMessage(message);
      } catch (error) {
        console.warn('🎯 TabLeader: Failed to broadcast via channel', error);
      }
    }
    
    // Also broadcast via localStorage for fallback
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(message));
    } catch (error) {
      console.warn('🎯 TabLeader: Failed to broadcast via localStorage', error);
    }
  }

  private attemptLeadership() {
    // Check if there's a recent leader heartbeat
    const now = Date.now();
    if (now - this.lastLeaderHeartbeat > this.LEADER_TIMEOUT) {
      console.log('🎯 TabLeader: Claiming leadership for tab', this.tabId);
      this.isLeader = true;
      this.broadcast({ type: 'claim-leadership', tabId: this.tabId, timestamp: now });
      this.notifyLeadershipChange();
    }
  }

  private startHeartbeat() {
    this.heartbeatInterval = window.setInterval(() => {
      if (this.isLeader) {
        const timestamp = Date.now();
        this.lastLeaderHeartbeat = timestamp;
        this.broadcast({ type: 'heartbeat', tabId: this.tabId, timestamp });
      }
    }, this.HEARTBEAT_INTERVAL);
  }

  private startLeadershipCheck() {
    this.checkInterval = window.setInterval(() => {
      const now = Date.now();
      
      // If we're not leader and haven't seen a heartbeat recently, try to become leader
      if (!this.isLeader && now - this.lastLeaderHeartbeat > this.LEADER_TIMEOUT) {
        console.log('🎯 TabLeader: No leader detected, attempting to claim');
        this.attemptLeadership();
      }
      
      // If we are leader but tab is hidden for too long, release
      if (this.isLeader && document.hidden) {
        console.log('🎯 TabLeader: Leader tab hidden, releasing');
        this.releaseLeadership();
      }
    }, 3000); // Check every 3s
  }

  private releaseLeadership() {
    if (this.isLeader) {
      console.log('🎯 TabLeader: Releasing leadership');
      this.isLeader = false;
      this.broadcast({ type: 'release-leadership', tabId: this.tabId });
      this.notifyLeadershipChange();
    }
  }

  private notifyLeadershipChange() {
    console.log('🎯 TabLeader: Leadership changed, isLeader:', this.isLeader);
    if (this.onLeadershipChange) {
      this.onLeadershipChange(this.isLeader);
    }
  }

  public getIsLeader(): boolean {
    return this.isLeader;
  }

  public onLeaderChange(callback: (isLeader: boolean) => void) {
    this.onLeadershipChange = callback;
  }

  public cleanup() {
    this.releaseLeadership();
    
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
    if (this.channel) {
      this.channel.close();
    }
  }
}

// Singleton instance
export const tabLeader = new TabLeader();
