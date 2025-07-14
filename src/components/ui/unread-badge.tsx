import React from 'react';
import { cn } from '@/lib/utils';

interface UnreadBadgeProps {
  count: number;
  className?: string;
}

export const UnreadBadge: React.FC<UnreadBadgeProps> = ({ count, className }) => {
  if (count === 0) return null;

  return (
    <div
      className={cn(
        "absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full min-w-5 h-5 flex items-center justify-center text-xs font-medium shadow-sm",
        className
      )}
    >
      {count > 99 ? '99+' : count}
    </div>
  );
};