import { LucideIcon, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export interface ContentSidebarItem {
  value: string;
  label: string;
  count?: number;
}

export interface ContentSidebarGroup {
  label: string;
  items: ContentSidebarItem[];
  collapsible?: boolean;
  defaultOpen?: boolean;
}

type SidebarEntry = ContentSidebarItem | ContentSidebarGroup;

function isGroup(entry: SidebarEntry): entry is ContentSidebarGroup {
  return "items" in entry;
}

interface ContentSidebarProps {
  title: string;
  icon: LucideIcon;
  items: SidebarEntry[];
  activeItem: string;
  onItemChange: (value: string) => void;
  openGroups?: string[];
  onGroupToggle?: (label: string) => void;
}

export function ContentSidebar({
  title,
  icon: Icon,
  items,
  activeItem,
  onItemChange,
  openGroups = [],
  onGroupToggle,
}: ContentSidebarProps) {
  const renderItem = (item: ContentSidebarItem, indent = false) => {
    const isActive = activeItem === item.value;
    return (
      <button
        key={item.value}
        onClick={() => onItemChange(item.value)}
        className={cn(
          "w-full text-left px-3 py-2 text-sm rounded-md transition-colors",
          "hover:bg-muted",
          indent && "pl-6",
          isActive
            ? "bg-primary/10 text-primary font-medium"
            : "text-foreground"
        )}
      >
        {item.label}
      </button>
    );
  };

  const renderGroup = (group: ContentSidebarGroup) => {
    const isOpen = openGroups.includes(group.label);
    const hasActiveChild = group.items.some((i) => activeItem === i.value);

    if (!group.collapsible) {
      return (
        <div key={group.label} className="space-y-0.5">
          <div className="px-3 py-2 text-sm font-medium text-muted-foreground">
            {group.label}
          </div>
          {group.items.map((item) => renderItem(item, true))}
        </div>
      );
    }

    return (
      <Collapsible
        key={group.label}
        open={isOpen || hasActiveChild}
        onOpenChange={() => onGroupToggle?.(group.label)}
      >
        <CollapsibleTrigger
          className={cn(
            "w-full flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors",
            "hover:bg-muted text-foreground"
          )}
        >
          <span>{group.label}</span>
          <ChevronRight
            className={cn(
              "h-4 w-4 flex-shrink-0 transition-transform duration-200",
              (isOpen || hasActiveChild) && "rotate-90"
            )}
          />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="space-y-0.5">
            {group.items.map((item) => renderItem(item, true))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  };

  return (
    <div className="w-[220px] flex-shrink-0 border-r border-border bg-background">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 h-10">
          <Icon className="h-4 w-4" />
          {title}
        </h3>
      </div>

      <ScrollArea className="h-[calc(100vh-200px)]">
        <div className="p-2 space-y-0.5">
          {items.map((entry) =>
            isGroup(entry) ? renderGroup(entry) : renderItem(entry)
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
