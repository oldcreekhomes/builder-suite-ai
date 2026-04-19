import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TakeoffProjectProfile } from './useProjectProfile';

export interface MatchedProject {
  projectId: string;
  address: string;
  score: number;
  reasons: string[];
  totalActual: number;
}

export interface SuggestedBudgetLine {
  costCodeId: string;
  costCodeCode: string;
  costCodeName: string;
  avgAmount: number;
  sampleCount: number;
}

export interface HistoricalBudgetMatch {
  matches: MatchedProject[];
  suggestedLines: SuggestedBudgetLine[];
  totalSuggested: number;
}

/**
 * Score historical projects against the new profile and suggest a starter budget
 * by averaging actual costs per cost_code across the top 3 matches.
 *
 * Pure SQL + in-memory scoring. No AI.
 */
export function useHistoricalBudgetMatch(
  profile: TakeoffProjectProfile | null | undefined,
  enabled: boolean = true,
) {
  return useQuery({
    queryKey: [
      'historical-budget-match',
      profile?.id,
      profile?.total_sf,
      profile?.bedrooms,
      profile?.garage_bays,
      profile?.basement_type,
    ],
    enabled: enabled && !!profile,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<HistoricalBudgetMatch> => {
      if (!profile) return { matches: [], suggestedLines: [], totalSuggested: 0 };

      // Pull all historical project_budgets rows with actuals + the parent project
      // Note: relies on RLS to scope to current company.
      const { data: budgetRows, error } = await supabase
        .from('project_budgets')
        .select(`
          project_id,
          cost_code_id,
          actual_amount,
          projects!project_budgets_project_id_fkey(id, address, square_footage, bedrooms, bathrooms, garage_bays, basement_type),
          cost_codes(id, code, name)
        `)
        .not('actual_amount', 'is', null)
        .neq('actual_amount', 0);

      if (error) throw error;

      // Group rows by project
      const byProject = new Map<string, {
        project: any;
        rows: { costCodeId: string; costCodeCode: string; costCodeName: string; amount: number }[];
        total: number;
      }>();

      (budgetRows ?? []).forEach((r: any) => {
        const proj = r.projects;
        if (!proj?.id) return;
        const cc = r.cost_codes;
        if (!cc?.id) return;
        if (!byProject.has(proj.id)) {
          byProject.set(proj.id, { project: proj, rows: [], total: 0 });
        }
        const entry = byProject.get(proj.id)!;
        const amt = Number(r.actual_amount) || 0;
        entry.rows.push({ costCodeId: cc.id, costCodeCode: cc.code, costCodeName: cc.name, amount: amt });
        entry.total += amt;
      });

      // Score each project
      const scored: MatchedProject[] = [];
      byProject.forEach(({ project, total }, projectId) => {
        let score = 0;
        const reasons: string[] = [];

        // Bedrooms ±1
        if (profile.bedrooms != null && project.bedrooms != null) {
          const diff = Math.abs(project.bedrooms - profile.bedrooms);
          if (diff === 0) { score += 30; reasons.push('Bedrooms match'); }
          else if (diff === 1) { score += 15; reasons.push('Bedrooms ±1'); }
        }

        // SF within ±15%
        if (profile.total_sf != null && project.square_footage != null && project.square_footage > 0) {
          const pct = Math.abs(Number(project.square_footage) - Number(profile.total_sf)) / Number(profile.total_sf);
          if (pct <= 0.15) { score += 30; reasons.push(`SF within ±15%`); }
          else if (pct <= 0.30) { score += 10; reasons.push(`SF within ±30%`); }
        }

        // Garage bays
        if (profile.garage_bays != null && project.garage_bays != null) {
          if (project.garage_bays === profile.garage_bays) {
            score += 15;
            reasons.push('Garage bays match');
          }
        }

        // Basement type
        if (profile.basement_type && project.basement_type) {
          if (String(project.basement_type).toLowerCase() === String(profile.basement_type).toLowerCase()) {
            score += 15;
            reasons.push('Basement match');
          }
        }

        if (score > 0) {
          scored.push({
            projectId,
            address: project.address || 'Unknown',
            score,
            reasons,
            totalActual: total,
          });
        }
      });

      scored.sort((a, b) => b.score - a.score);
      const top = scored.slice(0, 3);

      // Aggregate per cost_code across top matches (average)
      const ccAccum = new Map<string, { code: string; name: string; sum: number; count: number }>();
      const topIds = new Set(top.map((m) => m.projectId));
      byProject.forEach(({ rows }, projectId) => {
        if (!topIds.has(projectId)) return;
        // sum amounts per cost code per project, then we'll average across projects
        const perProject = new Map<string, { code: string; name: string; amount: number }>();
        rows.forEach((r) => {
          const cur = perProject.get(r.costCodeId);
          if (cur) cur.amount += r.amount;
          else perProject.set(r.costCodeId, { code: r.costCodeCode, name: r.costCodeName, amount: r.amount });
        });
        perProject.forEach((v, k) => {
          const acc = ccAccum.get(k);
          if (acc) {
            acc.sum += v.amount;
            acc.count += 1;
          } else {
            ccAccum.set(k, { code: v.code, name: v.name, sum: v.amount, count: 1 });
          }
        });
      });

      const suggestedLines: SuggestedBudgetLine[] = [];
      ccAccum.forEach((v, costCodeId) => {
        suggestedLines.push({
          costCodeId,
          costCodeCode: v.code,
          costCodeName: v.name,
          avgAmount: v.sum / v.count,
          sampleCount: v.count,
        });
      });
      suggestedLines.sort((a, b) => a.costCodeCode.localeCompare(b.costCodeCode));

      const totalSuggested = suggestedLines.reduce((s, l) => s + l.avgAmount, 0);

      return { matches: top, suggestedLines, totalSuggested };
    },
  });
}
