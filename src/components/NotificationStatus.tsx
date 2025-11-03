import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { WifiOff, Wifi, RefreshCw, Volume2, VolumeX } from 'lucide-react';
import { audioManager } from '@/utils/audioManager';
import { tabLeader } from '@/utils/tabLeader';

interface NotificationStatusProps {
  connectionState: 'connected' | 'connecting' | 'disconnected' | 'error';
  onReconnect?: () => void;
}

export const NotificationStatus = ({ connectionState, onReconnect }: NotificationStatusProps) => {
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [isLeader, setIsLeader] = useState(tabLeader.getIsLeader());
  const [testingSound, setTestingSound] = useState(false);

  useEffect(() => {
    // Listen to leadership changes
    tabLeader.onLeaderChange(setIsLeader);
    
    // Check audio status periodically
    const checkAudio = () => {
      setAudioEnabled(audioManager.isAudioUnlocked());
    };
    
    const interval = setInterval(checkAudio, 2000);
    checkAudio();
    
    return () => clearInterval(interval);
  }, []);

  const handleEnableSound = async () => {
    const unlocked = await audioManager.ensureUnlocked();
    setAudioEnabled(unlocked);
    
    if (!unlocked) {
      console.warn('🔔 NotificationStatus: Failed to unlock audio');
    }
  };

  const handleTestSound = async () => {
    setTestingSound(true);
    const played = await audioManager.playNotificationSound();
    setTestingSound(false);
    
    if (!played) {
      console.warn('🔔 NotificationStatus: Test sound failed to play');
    }
  };

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

  // Show status when not connected or audio not enabled
  const shouldShow = connectionState !== 'connected' || !audioEnabled;
  
  if (!shouldShow) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-2 flex-wrap">
      {connectionState !== 'connected' && (
        <>
          <Badge 
            variant={getConnectionVariant()} 
            className="flex items-center gap-1.5"
          >
            {getConnectionIcon()}
            <span className="text-xs">{getConnectionText()}</span>
          </Badge>
          
          {onReconnect && connectionState === 'error' && (
            <Button
              size="sm"
              variant="outline"
              onClick={onReconnect}
              className="h-6 text-xs"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Retry
            </Button>
          )}
        </>
      )}
      
      {!audioEnabled && (
        <div className="flex items-center gap-2">
          <Badge 
            variant="outline" 
            className="flex items-center gap-1.5 cursor-pointer hover:bg-accent"
            onClick={handleEnableSound}
          >
            <VolumeX className="h-3 w-3" />
            <span className="text-xs">Click to enable sound</span>
          </Badge>
          
          {audioEnabled && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleTestSound}
              disabled={testingSound}
              className="h-6 text-xs"
            >
              <Volume2 className="h-3 w-3 mr-1" />
              Test
            </Button>
          )}
        </div>
      )}

      {audioEnabled && !isLeader && (
        <Badge variant="secondary" className="flex items-center gap-1.5">
          <Volume2 className="h-3 w-3" />
          <span className="text-xs">Sound: Background tab</span>
        </Badge>
      )}
    </div>
  );
};
