import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCostCodeSearch } from '@/hooks/useCostCodeSearch';
import type { LineItemInput } from '@/hooks/usePurchaseOrderLines';

/**
 * Calls the `extract-po-lines` edge function before the Confirm PO dialog opens,
 * so the dialog can render with line items already populated.
 *
 * Pinned to the bid package's single cost code (lockedCostCodeId) — vendors are
 * always bid for one scope, so all lines roll up to that one code.
 */
export function usePreExtractPOLines() {
  const { costCodes } = useCostCodeSearch();
  const { toast } = useToast();
  const [isExtracting, setIsExtracting] = useState(false);

  const extract = async (
    proposalPaths: string[] | null | undefined,
    costCodeId: string,
  ): Promise<LineItemInput[] | null> => {
    if (!proposalPaths || proposalPaths.length === 0) return null;
    setIsExtracting(true);
    try {
      const { data, error } = await supabase.functions.invoke('extract-po-lines', {
        body: {
          proposalPaths,
          costCodes: costCodes.map((c) => ({ id: c.id, code: c.code, name: c.name })),
          fallbackCostCodeId: costCodeId,
          lockedCostCodeId: costCodeId,
        },
      });
      if (error) throw error;
      const lines = (data?.lines || []) as LineItemInput[];
      return lines.length > 0 ? lines : null;
    } catch (e: any) {
      console.error('extract-po-lines failed:', e);
      const msg = e?.message || '';
      if (msg.includes('429')) {
        toast({ title: 'Rate limit', description: 'AI rate limit hit, please retry in a moment.', variant: 'destructive' });
      } else if (msg.includes('402')) {
        toast({ title: 'Credits exhausted', description: 'Add AI credits in Settings → Workspace → Usage.', variant: 'destructive' });
      } else {
        toast({ title: "Couldn't auto-extract", description: 'Enter line items manually.' });
      }
      return null;
    } finally {
      setIsExtracting(false);
    }
  };

  return { extract, isExtracting };
}
