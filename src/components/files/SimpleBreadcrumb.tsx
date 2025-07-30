import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SimpleBreadcrumbProps {
  currentPath: string;
  onPathClick: (path: string) => void;
}

export const SimpleBreadcrumb: React.FC<SimpleBreadcrumbProps> = ({
  currentPath,
  onPathClick
}) => {
  const pathSegments = currentPath ? currentPath.split('/') : [];

  const handlePathClick = (index: number) => {
    if (index === -1) {
      // Root clicked
      onPathClick('');
    } else {
      // Build path up to clicked segment
      const newPath = pathSegments.slice(0, index + 1).join('/');
      onPathClick(newPath);
    }
  };

  return (
    <div className="flex items-center gap-1 text-sm">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handlePathClick(-1)}
        className="gap-1 h-8 px-2"
      >
        <Home className="h-4 w-4" />
        Project Files
      </Button>

      {pathSegments.map((segment, index) => (
        <React.Fragment key={index}>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handlePathClick(index)}
            className="h-8 px-2"
          >
            {segment}
          </Button>
        </React.Fragment>
      ))}
    </div>
  );
};