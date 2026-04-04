import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Building, Trash2 } from "lucide-react";
import { calculateIncome, calculateMetrics, ApartmentInputs } from "@/lib/apartmentCalculations";

const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

interface ProFormaRow {
  id: string;
  name: string;
  inputs: ApartmentInputs;
  created_at: string;
  updated_at: string;
}

interface Props {
  items: ProFormaRow[];
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
}

export default function ApartmentsList({ items, onSelect, onCreate, onDelete }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Apartment Pro Formas</h2>
        <Button onClick={onCreate} size="sm">
          <Plus className="h-4 w-4 mr-1" /> New Pro Forma
        </Button>
      </div>

      {items.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Building className="h-12 w-12 mb-3" />
            <p className="text-lg font-medium">No pro formas yet</p>
            <p className="text-sm">Create your first apartment pro forma analysis.</p>
            <Button onClick={onCreate} className="mt-4" size="sm">
              <Plus className="h-4 w-4 mr-1" /> New Pro Forma
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map(item => {
          const income = calculateIncome(item.inputs);
          const metrics = calculateMetrics(item.inputs, income);
          return (
            <Card
              key={item.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => onSelect(item.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Building className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold text-sm">{item.name}</h3>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={e => { e.stopPropagation(); onDelete(item.id); }}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                  <span>Units: {item.inputs.totalUnits}</span>
                  <span>NOI: {fmt(income.noi)}</span>
                  <span>DSCR: {metrics.dscr.toFixed(2)}x</span>
                  <span>Cap Rate: {(metrics.capRate * 100).toFixed(1)}%</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Updated {new Date(item.updated_at).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
