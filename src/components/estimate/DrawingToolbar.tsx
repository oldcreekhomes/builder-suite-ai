import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MousePointer2, Circle, Minus, Square, Pentagon, Ruler, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";

type DrawingTool = 'select' | 'count' | 'line' | 'rectangle' | 'polygon';

const COMMON_SCALES = [
  "1/16\" = 1'-0\"",
  "3/32\" = 1'-0\"", 
  "1/8\" = 1'-0\"",
  "3/16\" = 1'-0\"",
  "1/4\" = 1'-0\"",
  "3/8\" = 1'-0\"",
  "1/2\" = 1'-0\"",
  "3/4\" = 1'-0\"",
  "1\" = 1'-0\"",
  "1-1/2\" = 1'-0\"",
  "3\" = 1'-0\"",
  "Auto-Detect Scale",
  "Custom..."
];

interface DrawingToolbarProps {
  activeTool: DrawingTool;
  onToolClick: (tool: DrawingTool) => void;
  onCalibrateScale: () => void;
  selectedScale?: string | null;
  onScaleChange: (scale: string) => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
}


export function DrawingToolbar({ 
  activeTool, 
  onToolClick, 
  onCalibrateScale, 
  selectedScale,
  onScaleChange,
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

      <Select
        value={selectedScale || "not-set"}
        onValueChange={onScaleChange}
      >
        <SelectTrigger className="w-[180px] h-9">
          <Ruler className="mr-2 h-4 w-4 shrink-0" />
          <SelectValue>
            {selectedScale || "Set Scale"}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-background border-border z-50">
          {COMMON_SCALES.map(scale => (
            <SelectItem key={scale} value={scale}>
              {scale}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

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

