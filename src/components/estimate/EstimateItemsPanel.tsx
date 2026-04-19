import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ListChecks, Trash2, Plus } from 'lucide-react';
import { useEstimateItems, type EstimateItem } from '@/hooks/useEstimateItems';
import { useAuth } from '@/hooks/useAuth';

interface EstimateItemsPanelProps {
  takeoffProjectId: string;
  loading?: boolean;
}

export function EstimateItemsPanel({ takeoffProjectId, loading }: EstimateItemsPanelProps) {
  const { user } = useAuth();
  const { data: items = [], isLoading, updateItem, deleteItem, addItem } = useEstimateItems(takeoffProjectId);

  const grouped = useMemo(() => {
    const map = new Map<string, EstimateItem[]>();
    for (const it of items) {
      const key = it.cost_code_label || 'Uncategorized';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(it);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [items]);

  const showLoader = loading || isLoading;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ListChecks className="h-4 w-4 text-primary" />
          Extracted Estimate Items
          {showLoader && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
          {!showLoader && items.length > 0 && (
            <Badge variant="secondary" className="ml-1 text-[10px]">
              {items.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 max-h-[420px] overflow-y-auto">
        {showLoader && items.length === 0 ? (
          <p className="text-xs text-muted-foreground">Looking for windows, doors, garage doors, roof pitches…</p>
        ) : items.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">
            No items detected. The AI only extracts items matching cost codes flagged as "Estimate" in your settings.
          </p>
        ) : (
          grouped.map(([label, rows]) => (
            <div key={label} className="space-y-1">
              <div className="text-xs font-semibold text-foreground bg-muted/50 px-2 py-1 rounded">
                {label}
              </div>
              {rows.map((it) => (
                <div key={it.id} className="grid grid-cols-[1fr_110px_60px_50px_28px] gap-1 items-center px-1">
                  <Input
                    value={it.item_label ?? ''}
                    placeholder="Label"
                    className="h-7 text-xs"
                    onChange={(e) => updateItem({ id: it.id, patch: { item_label: e.target.value } })}
                  />
                  <Input
                    value={it.size ?? ''}
                    placeholder="Size"
                    className="h-7 text-xs"
                    onChange={(e) => updateItem({ id: it.id, patch: { size: e.target.value } })}
                  />
                  <Input
                    type="number"
                    value={it.quantity ?? ''}
                    className="h-7 text-xs"
                    onChange={(e) =>
                      updateItem({ id: it.id, patch: { quantity: e.target.value === '' ? null : Number(e.target.value) } })
                    }
                  />
                  <Input
                    value={it.unit ?? 'EA'}
                    className="h-7 text-xs"
                    onChange={(e) => updateItem({ id: it.id, patch: { unit: e.target.value } })}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0"
                    onClick={() => deleteItem(it.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          ))
        )}

        {user && !showLoader && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="w-full h-7 text-xs"
            onClick={() =>
              addItem({
                takeoff_project_id: takeoffProjectId,
                owner_id: user.id,
                cost_code_id: null,
                cost_code_label: 'Uncategorized',
                item_label: '',
                size: null,
                quantity: 1,
                unit: 'EA',
                spec: {},
                source_sheet: null,
                confidence: 'low',
                notes: null,
              } as any)
            }
          >
            <Plus className="h-3 w-3 mr-1" /> Add item
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
