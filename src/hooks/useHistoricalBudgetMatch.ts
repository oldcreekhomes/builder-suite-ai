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
 * Score historical projects (those with their own takeoff_project_profiles) against
 * the current profile, then aggregate actual costs from project_budgets across the
 * top 3 matches to suggest a starter budget. Pure SQL + in-memory scoring.
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

      // 1) Pull other profiles + the project address they map to (via takeoff_projects.project_id)
      const { data: otherProfiles, error: profErr } = await supabase
        .from('takeoff_project_profiles')
        .select(`
          id, total_sf, bedrooms, garage_bays, basement_type,
          takeoff_projects!takeoff_project_profiles_takeoff_project_id_fkey(
            id, project_id,
            projects!takeoff_projects_project_id_fkey(id, address)
          )
        `)
        .neq('id', profile.id);

      if (profErr) throw profErr;

      // Map projectId -> {address, score, reasons}
      const projectScores = new Map<string, { address: string; score: number; reasons: string[] }>();

      (otherProfiles ?? []).forEach((p: any) => {
        const tp = p.takeoff_projects;
        const proj = tp?.projects;
        if (!proj?.id) return;

        let score = 0;
        const reasons: string[] = [];

        if (profile.bedrooms != null && p.bedrooms != null) {
          const diff = Math.abs(p.bedrooms - profile.bedrooms);
          if (diff === 0) { score += 30; reasons.push('Bedrooms match'); }
          else if (diff === 1) { score += 15; reasons.push('Bedrooms ±1'); }
        }
        if (profile.total_sf != null && p.total_sf != null && Number(p.total_sf) > 0) {
          const pct = Math.abs(Number(p.total_sf) - Number(profile.total_sf)) / Number(profile.total_sf);
          if (pct <= 0.15) { score += 30; reasons.push('SF within ±15%'); }
          else if (pct <= 0.30) { score += 10; reasons.push('SF within ±30%'); }
        }
        if (profile.garage_bays != null && p.garage_bays != null && p.garage_bays === profile.garage_bays) {
          score += 15; reasons.push('Garage bays match');
        }
        if (profile.basement_type && p.basement_type &&
            String(p.basement_type).toLowerCase() === String(profile.basement_type).toLowerCase()) {
          score += 15; reasons.push('Basement match');
        }

        if (score > 0) {
          // Keep best score per project
          const existing = projectScores.get(proj.id);
          if (!existing || existing.score < score) {
            projectScores.set(proj.id, { address: proj.address || 'Unknown', score, reasons });
          }
        }
      });

      // Top 3 projects
      const top = Array.from(projectScores.entries())
        .map(([projectId, v]) => ({ projectId, ...v }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);

      if (top.length === 0) {
        return { matches: [], suggestedLines: [], totalSuggested: 0 };
      }

      const topIds = top.map((m) => m.projectId);

      // 2) Pull actual budget rows for those projects
      const { data: budgetRows, error: budErr } = await supabase
        .from('project_budgets')
        .select(`
          project_id, cost_code_id, actual_amount,
          cost_codes(id, code, name)
        `)
        .in('project_id', topIds)
        .not('actual_amount', 'is', null)
        .neq('actual_amount', 0);

      if (budErr) throw budErr;

      // 3) Aggregate per project totals + per cost-code averages across matched projects
      const totalsByProject = new Map<string, number>();
      const ccPerProject = new Map<string, Map<string, { code: string; name: string; amount: number }>>();

      (budgetRows ?? []).forEach((r: any) => {
        const cc = r.cost_codes;
        if (!cc?.id) return;
        const amt = Number(r.actual_amount) || 0;
        totalsByProject.set(r.project_id, (totalsByProject.get(r.project_id) || 0) + amt);

        if (!ccPerProject.has(r.project_id)) ccPerProject.set(r.project_id, new Map());
        const inner = ccPerProject.get(r.project_id)!;
        const cur = inner.get(cc.id);
        if (cur) cur.amount += amt;
        else inner.set(cc.id, { code: cc.code, name: cc.name, amount: amt });
      });

      const matches: MatchedProject[] = top.map((m) => ({
        projectId: m.projectId,
        address: m.address,
        score: m.score,
        reasons: m.reasons,
        totalActual: totalsByProject.get(m.projectId) || 0,
      }));

      const ccAccum = new Map<string, { code: string; name: string; sum: number; count: number }>();
      ccPerProject.forEach((inner) => {
        inner.forEach((v, costCodeId) => {
          const acc = ccAccum.get(costCodeId);
          if (acc) { acc.sum += v.amount; acc.count += 1; }
          else ccAccum.set(costCodeId, { code: v.code, name: v.name, sum: v.amount, count: 1 });
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

      return { matches, suggestedLines, totalSuggested };
    },
  });
}
