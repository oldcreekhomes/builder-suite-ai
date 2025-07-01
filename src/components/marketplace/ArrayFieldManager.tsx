
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Plus } from "lucide-react";

interface ArrayFieldManagerProps {
  label: string;
  items: string[];
  newItem: string;
  setNewItem: (value: string) => void;
  onAddItem: () => void;
  onRemoveItem: (item: string) => void;
  placeholder: string;
  badgeVariant?: "default" | "secondary" | "outline";
  badgeClassName?: string;
}

export function ArrayFieldManager({
  label,
  items,
  newItem,
  setNewItem,
  onAddItem,
  onRemoveItem,
  placeholder,
  badgeVariant = "outline",
  badgeClassName = "text-xs"
}: ArrayFieldManagerProps) {
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onAddItem();
    }
  };

  return (
    <div>
      <Label>{label}</Label>
      <div className="flex gap-2 mb-2">
        <Input
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          placeholder={placeholder}
          onKeyPress={handleKeyPress}
        />
        <Button type="button" onClick={onAddItem} size="sm">
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <Badge key={item} variant={badgeVariant} className={badgeClassName}>
            {item}
            <X
              className="h-3 w-3 ml-1 cursor-pointer"
              onClick={() => onRemoveItem(item)}
            />
          </Badge>
        ))}
      </div>
    </div>
  );
}
