import { Eye, EyeOff } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

interface AnnotationVisibilityPanelProps {
  takeoffItems: Array<{ id: string; category: string; color: string; annotationCount?: number }>;
  visibleAnnotations: Set<string>;
  onToggle: (itemId: string) => void;
}

export function AnnotationVisibilityPanel({
  takeoffItems,
  visibleAnnotations,
  onToggle,
}: AnnotationVisibilityPanelProps) {
  return (
    <div className="border-t p-4">
      <h4 className="text-sm font-medium mb-2">Annotation Layers</h4>
      <ScrollArea className="h-[200px]">
        <div className="space-y-2">
          {takeoffItems.map(item => (
            <Button
              key={item.id}
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={() => onToggle(item.id)}
            >
              <div className="flex items-center gap-2 flex-1">
                {visibleAnnotations.has(item.id) ? (
                  <Eye className="h-4 w-4" />
                ) : (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                )}
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm">{item.category}</span>
                {item.annotationCount && (
                  <span className="ml-auto text-xs text-muted-foreground">
                    ({item.annotationCount})
                  </span>
                )}
              </div>
            </Button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
