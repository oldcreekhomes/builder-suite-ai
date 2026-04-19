import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight, History, Loader2 } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { HistoricalBudgetMatch } from '@/hooks/useHistoricalBudgetMatch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface HistoricalBudgetSuggestionProps {
  data: HistoricalBudgetMatch | undefined;
  loading?: boolean;
  onApply?: () => void;
  applying?: boolean;
  applied?: boolean;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

export function HistoricalBudgetSuggestion({
  data,
  loading,
  onApply,
  applying,
  applied,
}: HistoricalBudgetSuggestionProps) {
  const [open, setOpen] = useState(true);

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4 text-primary" />
            Historical Budget
            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">Matching against past projects…</p>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.matches.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4 text-muted-foreground" />
            Historical Budget
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            No similar past projects found yet. Once you have a few completed projects with profiles, suggestions will appear here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer hover:bg-accent/50 transition-colors">
            <CardTitle className="text-base flex items-center gap-2">
              {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <History className="h-4 w-4 text-primary" />
              Historical Budget Suggestion
              <Badge variant="secondary" className="ml-auto">
                {fmt(data.totalSuggested)}
              </Badge>
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Based on {data.matches.length} similar project{data.matches.length !== 1 ? 's' : ''}:</p>
              {data.matches.map((m) => (
                <div key={m.projectId} className="flex items-center gap-2 text-xs">
                  <span className="flex-1 truncate">{m.address}</span>
                  <Badge variant="outline" className="text-[10px]">
                    score {m.score}
                  </Badge>
                  <span className="text-muted-foreground tabular-nums">{fmt(m.totalActual)}</span>
                </div>
              ))}
            </div>

            <div className="border rounded-md max-h-64 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Code</TableHead>
                    <TableHead className="text-xs">Name</TableHead>
                    <TableHead className="text-xs text-right">Avg Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.suggestedLines.map((l) => (
                    <TableRow key={l.costCodeId}>
                      <TableCell className="text-xs py-1.5 font-mono">{l.costCodeCode}</TableCell>
                      <TableCell className="text-xs py-1.5 truncate max-w-[160px]">{l.costCodeName}</TableCell>
                      <TableCell className="text-xs py-1.5 text-right tabular-nums">{fmt(l.avgAmount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {onApply && (
              <Button
                size="sm"
                className="w-full"
                onClick={onApply}
                disabled={applying || applied}
                variant={applied ? 'outline' : 'default'}
              >
                {applying ? (
                  <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Applying…</>
                ) : applied ? (
                  'Applied to project budget ✓'
                ) : (
                  'Apply as starter budget'
                )}
              </Button>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
