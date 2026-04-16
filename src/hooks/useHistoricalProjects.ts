import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface HistoricalProject {
  /** Composite key: "projectId" or "projectId::lotId" */
  id: string;
  projectId: string;
  lotId: string | null;
  address: string;
}

export function useHistoricalProjects(enabled: boolean = true) {
  return useQuery({
    queryKey: ['historical-projects'],
    queryFn: async (): Promise<HistoricalProject[]> => {
      const { data, error } = await supabase
        .from('project_budgets')
        .select(`
          project_id,
          lot_id,
          projects!project_budgets_project_id_fkey(id, address),
          project_lots!project_budgets_lot_id_fkey(id, lot_name, lot_number)
        `)
        .not('actual_amount', 'is', null)
        .neq('actual_amount', 0);
      
      if (error) throw error;
      
      const suffixes = /\b(street|avenue|boulevard|drive|lane|road|court|circle|place|way|trail|terrace|parkway)\b\.?/gi;
      const suffixMap: Record<string, string> = {
        street: 'St', avenue: 'Ave', boulevard: 'Blvd', drive: 'Dr',
        lane: 'Ln', road: 'Rd', court: 'Ct', circle: 'Cir',
        place: 'Pl', way: 'Way', trail: 'Trl', terrace: 'Ter', parkway: 'Pkwy',
      };
      
      const abbreviations = Object.values(suffixMap);
      const formatAddress = (full: string): string => {
        let street = full.split(',')[0].trim();
        street = street.replace(/\b([NSEW])\./gi, '$1');
        street = street.replace(suffixes, (m) => suffixMap[m.replace('.', '').toLowerCase()] || m);
        for (let i = abbreviations.length - 1; i >= 0; i--) {
          const abbr = abbreviations[i];
          const re = new RegExp(`\\b(${abbr})\\b(.*)$`, 'i');
          const match = street.match(re);
          if (match) {
            street = street.substring(0, match.index! + match[1].length);
            break;
          }
        }
        return street;
      };

      // Group by project_id + lot_id
      const seen = new Map<string, HistoricalProject>();
      const projectLotCounts = new Map<string, Set<string | null>>();

      // First pass: count distinct lots per project
      data.forEach((item) => {
        const pid = item.project_id;
        if (!projectLotCounts.has(pid)) {
          projectLotCounts.set(pid, new Set());
        }
        projectLotCounts.get(pid)!.add(item.lot_id);
      });

      // Second pass: build entries
      data.forEach((item) => {
        const pid = item.project_id;
        const lid = item.lot_id;
        const compositeKey = lid ? `${pid}::${lid}` : pid;

        if (seen.has(compositeKey)) return;

        const shortAddress = formatAddress((item.projects as any)?.address || '');
        const lotInfo = item.project_lots as any;
        const lotCount = projectLotCounts.get(pid)?.size || 1;
        // Only append lot name if the project has multiple lot entries or a named lot
        const hasMultipleLots = lotCount > 1 || (lotCount === 1 && lid != null);
        const lotLabel = hasMultipleLots && lotInfo
          ? ` - ${lotInfo.lot_name || `Lot ${lotInfo.lot_number}`}`
          : '';

        seen.set(compositeKey, {
          id: compositeKey,
          projectId: pid,
          lotId: lid,
          address: `${shortAddress}${lotLabel}`,
        });
      });
      
      return Array.from(seen.values()).sort((a, b) => {
        const numA = parseInt(a.address.match(/^\d+/)?.[0] || '0', 10);
        const numB = parseInt(b.address.match(/^\d+/)?.[0] || '0', 10);
        if (numA !== numB) return numA - numB;
        return a.address.localeCompare(b.address);
      });
    },
  });
}

/** Parse a composite historical project key back into projectId and lotId */
export function parseHistoricalKey(key: string): { projectId: string; lotId: string | null } {
  const parts = key.split('::');
  return { projectId: parts[0], lotId: parts[1] || null };
}
