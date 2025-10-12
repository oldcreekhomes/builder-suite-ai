import { Loader2 } from 'lucide-react';

interface AppLoadingScreenProps {
  message?: string;
}

export const AppLoadingScreen = ({ message = 'Preparing your workspace...' }: AppLoadingScreenProps) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
        <p className="text-lg font-medium text-foreground">{message}</p>
        <p className="text-sm text-muted-foreground">This will only take a moment</p>
      </div>
    </div>
  );
};
