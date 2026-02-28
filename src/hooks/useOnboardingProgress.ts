import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useEffect, useCallback } from "react";

export interface OnboardingStep {
  key: string;
  label: string;
  completed: boolean;
  link?: string;
  action?: string;
}

export interface OnboardingProgress {
  steps: OnboardingStep[];
  completedCount: number;
  totalCount: number;
  allComplete: boolean;
  isLoading: boolean;
  dismissed: boolean;
  dismiss: () => void;
  confirmWelcome: () => void;
  confirmNoEmployees: () => void;
}

export const useOnboardingProgress = (): OnboardingProgress => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id;

  // Resolve effective owner ID (for employees, use their home_builder_id)
  const { data: userProfile } = useQuery({
    queryKey: ["onboarding-user-profile", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data } = await supabase
        .from("users")
        .select("id, role, home_builder_id")
        .eq("id", userId)
        .single();
      return data;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  // For employees, use home_builder_id; for owners, use their own id
  const effectiveOwnerId = userProfile?.role === 'owner'
    ? userId
    : userProfile?.home_builder_id ?? userId;

  // Query the onboarding_progress row
  const { data: progressRow, isLoading: isLoadingProgress } = useQuery({
    queryKey: ["onboarding-progress", effectiveOwnerId],
    queryFn: async () => {
      if (!effectiveOwnerId) return null;
      const { data, error } = await supabase
        .from("onboarding_progress")
        .select("*")
        .eq("home_builder_id", effectiveOwnerId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!effectiveOwnerId,
  });

  // Check live milestone data
  const { data: liveChecks, isLoading: isLoadingLive } = useQuery({
    queryKey: ["onboarding-live-checks", effectiveOwnerId],
    queryFn: async () => {
      if (!effectiveOwnerId) return null;

      const [userRes, costCodesRes, accountsRes, companiesRes, projectsRes, employeesRes, freshProgressRes] =
        await Promise.all([
          supabase.from("users").select("confirmed, hq_address").eq("id", effectiveOwnerId).single(),
          supabase.from("cost_codes").select("id", { count: "exact", head: true }).eq("owner_id", effectiveOwnerId),
          supabase.from("accounts").select("id", { count: "exact", head: true }).eq("owner_id", effectiveOwnerId),
          supabase.from("companies").select("id", { count: "exact", head: true }).eq("home_builder_id", effectiveOwnerId).is("archived_at", null),
          supabase.from("projects").select("id", { count: "exact", head: true }).eq("owner_id", effectiveOwnerId),
          supabase.from("users").select("id", { count: "exact", head: true }).eq("home_builder_id", effectiveOwnerId),
          supabase.from("onboarding_progress").select("welcome_confirmed, employees_invited").eq("home_builder_id", effectiveOwnerId).maybeSingle(),
        ]);

      return {
        email_verified: userRes.data?.confirmed === true,
        welcome_confirmed: freshProgressRes.data?.welcome_confirmed === true,
        company_profile_completed: !!(userRes.data?.hq_address),
        cost_codes_imported: (costCodesRes.count ?? 0) > 0,
        chart_of_accounts_imported: (accountsRes.count ?? 0) > 0,
        companies_added: (companiesRes.count ?? 0) > 0,
        first_project_created: (projectsRes.count ?? 0) > 0,
        employees_invited: (employeesRes.count ?? 0) > 0 || freshProgressRes.data?.employees_invited === true,
      };
    },
    enabled: !!effectiveOwnerId && progressRow !== undefined,
    staleTime: 30_000,
  });

  // Upsert / sync progress row
  useEffect(() => {
    if (!effectiveOwnerId || !liveChecks) return;

    const syncProgress = async () => {
      if (!progressRow) {
        // Create new row
        await supabase.from("onboarding_progress").insert({
          home_builder_id: effectiveOwnerId,
          ...liveChecks,
        });
        queryClient.invalidateQueries({ queryKey: ["onboarding-progress", effectiveOwnerId] });
        return;
      }

      // Check if any field changed
      const fields = [
        "email_verified",
        "welcome_confirmed",
        "company_profile_completed",
        "cost_codes_imported",
        "chart_of_accounts_imported",
        "companies_added",
        "first_project_created",
        "employees_invited",
      ] as const;

      const needsUpdate = fields.some(
        (f) => liveChecks[f] !== progressRow[f]
      );

      if (needsUpdate) {
        const updates: Record<string, boolean> = {};
        for (const f of fields) {
          if (liveChecks[f] !== progressRow[f]) {
            updates[f] = liveChecks[f];
          }
        }
        await supabase
          .from("onboarding_progress")
          .update(updates)
          .eq("home_builder_id", effectiveOwnerId);
        queryClient.invalidateQueries({ queryKey: ["onboarding-progress", effectiveOwnerId] });
      }
    };

    syncProgress();
  }, [effectiveOwnerId, liveChecks, progressRow, queryClient]);

  const merged = liveChecks ?? {
    email_verified: false,
    welcome_confirmed: false,
    company_profile_completed: false,
    cost_codes_imported: false,
    chart_of_accounts_imported: false,
    companies_added: false,
    first_project_created: false,
    employees_invited: false,
  };

  const steps: OnboardingStep[] = [
    { key: "email_verified", label: "Verify Email", completed: merged.email_verified },
    { key: "welcome_confirmed", label: "Confirm Welcome Message", completed: merged.welcome_confirmed, action: "welcome-dialog" },
    { key: "company_profile_completed", label: "Set Up Company Profile", completed: merged.company_profile_completed, link: "/settings?tab=company-profile" },
    { key: "cost_codes_imported", label: "Import Cost Codes", completed: merged.cost_codes_imported, link: "/settings?tab=cost-codes" },
    { key: "chart_of_accounts_imported", label: "Import Chart of Accounts", completed: merged.chart_of_accounts_imported, link: "/settings?tab=chart-of-accounts" },
    { key: "companies_added", label: "Add Subcontractors", completed: merged.companies_added, link: "/settings?tab=companies" },
    { key: "first_project_created", label: "Create First Project", completed: merged.first_project_created, action: "new-project" },
    { key: "employees_invited", label: "Invite Employees", completed: merged.employees_invited, action: "employees-dialog" },
  ];

  const completedCount = steps.filter((s) => s.completed).length;

  const dismissed = progressRow?.dismissed === true;

  const dismiss = useCallback(async () => {
    if (!effectiveOwnerId) return;
    await supabase
      .from("onboarding_progress")
      .update({ dismissed: true } as any)
      .eq("home_builder_id", effectiveOwnerId);
    queryClient.invalidateQueries({ queryKey: ["onboarding-progress", effectiveOwnerId] });
  }, [effectiveOwnerId, queryClient]);

  const confirmWelcome = useCallback(async () => {
    if (!effectiveOwnerId) return;
    await supabase
      .from("onboarding_progress")
      .update({ welcome_confirmed: true } as any)
      .eq("home_builder_id", effectiveOwnerId);
    queryClient.invalidateQueries({ queryKey: ["onboarding-progress", effectiveOwnerId] });
    queryClient.invalidateQueries({ queryKey: ["onboarding-live-checks", effectiveOwnerId] });
  }, [effectiveOwnerId, queryClient]);

  const confirmNoEmployees = useCallback(async () => {
    if (!effectiveOwnerId) return;
    await supabase
      .from("onboarding_progress")
      .update({ employees_invited: true } as any)
      .eq("home_builder_id", effectiveOwnerId);
    queryClient.invalidateQueries({ queryKey: ["onboarding-progress", effectiveOwnerId] });
    queryClient.invalidateQueries({ queryKey: ["onboarding-live-checks", effectiveOwnerId] });
  }, [effectiveOwnerId, queryClient]);

  return {
    steps,
    completedCount,
    totalCount: steps.length,
    allComplete: completedCount === steps.length,
    isLoading: isLoadingProgress || isLoadingLive,
    dismissed,
    dismiss,
    confirmWelcome,
    confirmNoEmployees,
  };
};
