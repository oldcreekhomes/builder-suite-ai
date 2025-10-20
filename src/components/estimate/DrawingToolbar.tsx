import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { MousePointer2, Circle, Minus, Square, Pentagon, Ruler, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";

type DrawingTool = 'select' | 'count' | 'line' | 'rectangle' | 'polygon';


interface DrawingToolbarProps {
  activeTool: DrawingTool;
  onToolClick: (tool: DrawingTool) => void;
  onCalibrateScale: () => void;
  scaleRatio?: number | null;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
}


export function DrawingToolbar({ 
  activeTool, 
  onToolClick, 
  onCalibrateScale, 
  scaleRatio,
  zoom,
  onZoomIn,
  onZoomOut,
  onZoomReset,
}: DrawingToolbarProps) {
  const tools = [
    { id: 'select' as const, icon: MousePointer2, label: 'Select' },
    { id: 'count' as const, icon: Circle, label: 'Count' },
    { id: 'line' as const, icon: Minus, label: 'Measure Line' },
    { id: 'rectangle' as const, icon: Square, label: 'Measure Area (Rectangle)' },
    { id: 'polygon' as const, icon: Pentagon, label: 'Measure Area (Polygon)' },
  ];

  return (
    <div className="flex items-center gap-2 p-4 border-b bg-background">
      <div className="flex items-center gap-1">
        {tools.map((tool) => (
          <Button
            key={tool.id}
            variant={activeTool === tool.id ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onToolClick(tool.id)}
            title={tool.label}
          >
            <tool.icon className="h-4 w-4" />
          </Button>
        ))}
      </div>

      <Separator orientation="vertical" className="h-8" />

      <Button
        variant="outline"
        size="sm"
        onClick={onCalibrateScale}
      >
        <Ruler className="mr-2 h-4 w-4" />
        {scaleRatio ? 'Adjust Scale' : 'Set Scale'}
      </Button>

      {scaleRatio && (
        <div className="text-sm text-muted-foreground ml-2">
          Scale: {scaleRatio.toFixed(4)} units/pixel
        </div>
      )}

      <Separator orientation="vertical" className="h-8" />

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onZoomOut}
          disabled={zoom <= 0.25}
          title="Zoom Out"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onZoomReset}
          title="Reset Zoom"
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onZoomIn}
          disabled={zoom >= 3}
          title="Zoom In"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <div className="text-sm text-muted-foreground ml-2 min-w-[60px]">
          {Math.round(zoom * 100)}%
        </div>
      </div>
    </div>
  );
}

