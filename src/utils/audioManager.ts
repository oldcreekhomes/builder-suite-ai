// Enhanced global audio manager for reliable notifications
class AudioManager {
  private audioContext: AudioContext | null = null;
  private isInitialized = false;
  private soundQueue: Array<() => Promise<void>> = [];
  private isPlayingSound = false;

  async getAudioContext(): Promise<AudioContext | null> {
    try {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        this.isInitialized = true;
      }

      // Handle suspended state (browser audio policy)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      return this.audioContext;
    } catch (error) {
      console.warn('🔊 AudioManager: Failed to create/resume AudioContext:', error);
      return null;
    }
  }

  // Queue-based sound playing to prevent overlapping and ensure reliability
  async playNotificationSound(): Promise<boolean> {
    return new Promise((resolve) => {
      const soundTask = async () => {
        try {
          console.log('🔊 AudioManager: Attempting to play notification sound');
          const audioContext = await this.getAudioContext();
          if (!audioContext) {
            console.warn('🔊 AudioManager: No audio context available');
            resolve(false);
            return;
          }

          const result = await this.createAndPlaySound(audioContext);
          console.log('🔊 AudioManager: Sound play result:', result);
          resolve(result);
        } catch (error) {
          console.warn('🔊 AudioManager: Sound task failed:', error);
          resolve(false);
        }
      };

      // Add to queue and process
      this.soundQueue.push(soundTask);
      this.processSoundQueue();
    });
  }

  private async processSoundQueue(): Promise<void> {
    if (this.isPlayingSound || this.soundQueue.length === 0) {
      return;
    }

    this.isPlayingSound = true;
    
    try {
      const soundTask = this.soundQueue.shift();
      if (soundTask) {
        await soundTask();
      }
    } catch (error) {
      console.warn('🔊 AudioManager: Error processing sound queue:', error);
    } finally {
      this.isPlayingSound = false;
      
      // Process next sound in queue if any
      if (this.soundQueue.length > 0) {
        setTimeout(() => this.processSoundQueue(), 100);
      }
    }
  }

  private async createAndPlaySound(audioContext: AudioContext): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Create a pleasant notification sound (like iOS message sound)
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        oscillator.onended = () => {
          try {
            oscillator.disconnect();
            gainNode.disconnect();
            console.log('🔊 AudioManager: Sound playback completed successfully');
            resolve(true);
          } catch (error) {
            console.warn('🔊 AudioManager: Cleanup error (non-critical):', error);
            resolve(true); // Still consider it successful
          }
        };

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
      } catch (error) {
        console.warn('🔊 AudioManager: Error creating/playing sound:', error);
        resolve(false);
      }
    });
  }

  cleanup() {
    console.log('🔊 AudioManager: Cleaning up');
    
    // Clear sound queue
    this.soundQueue = [];
    this.isPlayingSound = false;
    
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
      this.isInitialized = false;
    }
  }
}

// Export singleton instance
export const audioManager = new AudioManager();

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    audioManager.cleanup();
  });
}