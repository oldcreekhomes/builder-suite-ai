// Global audio manager for notifications to prevent AudioContext exhaustion
class AudioManager {
  private audioContext: AudioContext | null = null;
  private isInitialized = false;

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

  async playNotificationSound(): Promise<boolean> {
    try {
      const audioContext = await this.getAudioContext();
      if (!audioContext) return false;

      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Create a pleasant notification sound
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);

      // Clean up nodes after sound completes
      setTimeout(() => {
        try {
          oscillator.disconnect();
          gainNode.disconnect();
        } catch (error) {
          // Ignore cleanup errors
        }
      }, 600);

      return true;
    } catch (error) {
      console.warn('🔊 AudioManager: Failed to play notification sound:', error);
      return false;
    }
  }

  cleanup() {
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