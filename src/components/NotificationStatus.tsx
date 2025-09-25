import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, Volume2, VolumeX } from 'lucide-react';
import { audioManager } from '@/utils/audioManager';

interface NotificationStatusProps {
  connectionState: 'disconnected' | 'connecting' | 'connected' | 'error';
}

export const NotificationStatus = ({ connectionState }: NotificationStatusProps) => {
  const [audioEnabled, setAudioEnabled] = useState(false);

  useEffect(() => {
    // Initialize audio immediately when component mounts
    const initAudio = async () => {
      try {
        const enabled = await audioManager.initWithUserGesture();
        setAudioEnabled(enabled);
        console.log('🚀 Audio manager initialized:', enabled);
      } catch (error) {
        console.error('🚀 Error initializing audio:', error);
        setAudioEnabled(false);
      }
    };

    // Try to initialize immediately (in case user already interacted)
    initAudio();

    const handleClick = () => {
      if (!audioEnabled) {
        initAudio();
      }
    };

    // Listen for any user interaction to enable audio
    document.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleClick);
    document.addEventListener('touchstart', handleClick);

    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleClick);
      document.removeEventListener('touchstart', handleClick);
    };
  }, [audioEnabled]);

  const getConnectionIcon = () => {
    switch (connectionState) {
      case 'connected':
        return <Wifi className="h-3 w-3" />;
      case 'connecting':
        return <Wifi className="h-3 w-3 animate-pulse" />;
      default:
        return <WifiOff className="h-3 w-3" />;
    }
  };

  const getConnectionVariant = () => {
    switch (connectionState) {
      case 'connected':
        return 'default' as const;
      case 'connecting':
        return 'secondary' as const;
      default:
        return 'destructive' as const;
    }
  };

  const getConnectionText = () => {
    switch (connectionState) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'error':
        return 'Reconnecting...';
      default:
        return 'Offline';
    }
  };

  // Always show when there are connection issues or audio is disabled
  if (connectionState === 'connected' && audioEnabled) {
    // Hide when everything is working perfectly
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 flex gap-2">
      <Badge variant={getConnectionVariant()} className="flex items-center gap-1">
        {getConnectionIcon()}
        {getConnectionText()}
      </Badge>
      
      {!audioEnabled && (
        <Badge variant="outline" className="flex items-center gap-1">
          <VolumeX className="h-3 w-3" />
          Click to enable sound
        </Badge>
      )}
    </div>
  );
};