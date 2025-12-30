import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface MultiItemPopoverProps {
  items: string[];
  maxVisible?: number;
  label: string;
  emptyText?: string;
}

export function MultiItemPopover({ 
  items, 
  maxVisible = 1, 
  label,
  emptyText = "-" 
}: MultiItemPopoverProps) {
  if (!items || items.length === 0) {
    return <span className="text-muted-foreground">{emptyText}</span>;
  }

  // Get unique items
  const uniqueItems = [...new Set(items)];

  if (uniqueItems.length === 1) {
    return <span className="truncate max-w-[120px] inline-block" title={uniqueItems[0]}>{uniqueItems[0]}</span>;
  }

  const visibleItems = uniqueItems.slice(0, maxVisible);
  const remainingCount = uniqueItems.length - maxVisible;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="text-left hover:text-primary hover:underline cursor-pointer truncate max-w-[120px] inline-block">
          {visibleItems.join(", ")}
          {remainingCount > 0 && (
            <span className="text-muted-foreground ml-1">+{remainingCount}</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto max-w-[300px] p-3" align="start">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground mb-2">{label}</p>
          {uniqueItems.map((item, index) => (
            <p key={index} className="text-sm">{item}</p>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
