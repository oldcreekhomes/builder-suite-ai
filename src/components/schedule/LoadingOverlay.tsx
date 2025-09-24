import React from 'react';
import { cn } from '@/lib/utils';

interface LoadingOverlayProps {
  isVisible: boolean;
  message?: string;
  className?: string;
}

export function LoadingOverlay({ 
  isVisible, 
  message = "Recalculating schedule...",
  className 
}: LoadingOverlayProps) {
  if (!isVisible) return null;

  return (
    <div className={cn(
      "absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center",
      className
    )}>
      <div className="flex items-center space-x-3 bg-card border rounded-lg px-4 py-3 shadow-lg">
        <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent" />
        <span className="text-sm font-medium text-foreground">{message}</span>
      </div>
    </div>
  );
}

interface TaskLoadingStateProps {
  isLoading: boolean;
  children: React.ReactNode;
  className?: string;
}

export function TaskLoadingState({ 
  isLoading, 
  children, 
  className 
}: TaskLoadingStateProps) {
  return (
    <div className={cn("relative", className)}>
      {children}
      {isLoading && (
        <div className="absolute inset-0 bg-muted/50 flex items-center justify-center rounded">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}