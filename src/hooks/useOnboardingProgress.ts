import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useEffect } from "react";

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
}

export const useOnboardingProgress = (): OnboardingProgress => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id;

  // Query the onboarding_progress row
  const { data: progressRow, isLoading: isLoadingProgress } = useQuery({
    queryKey: ["onboarding-progress", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("onboarding_progress")
        .select("*")
        .eq("home_builder_id", userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  // Check live milestone data
  const { data: liveChecks, isLoading: isLoadingLive } = useQuery({
    queryKey: ["onboarding-live-checks", userId],
    queryFn: async () => {
      if (!userId) return null;

      const [userRes, costCodesRes, accountsRes, companiesRes, projectsRes, employeesRes] =
        await Promise.all([
          supabase.from("users").select("confirmed, hq_address").eq("id", userId).single(),
          supabase.from("cost_codes").select("id", { count: "exact", head: true }).eq("owner_id", userId),
          supabase.from("accounts").select("id", { count: "exact", head: true }).eq("owner_id", userId),
          supabase.from("companies").select("id", { count: "exact", head: true }).eq("home_builder_id", userId),
          supabase.from("projects").select("id", { count: "exact", head: true }).eq("owner_id", userId),
          supabase.from("users").select("id", { count: "exact", head: true }).eq("home_builder_id", userId).eq("user_type", "employee"),
        ]);

      return {
        email_verified: userRes.data?.confirmed === true,
        company_profile_completed: !!(userRes.data?.hq_address),
        cost_codes_imported: (costCodesRes.count ?? 0) > 0,
        chart_of_accounts_imported: (accountsRes.count ?? 0) > 0,
        companies_added: (companiesRes.count ?? 0) > 0,
        first_project_created: (projectsRes.count ?? 0) > 0,
        employees_invited: (employeesRes.count ?? 0) > 0,
      };
    },
    enabled: !!userId,
    staleTime: 30_000,
  });

  // Upsert / sync progress row
  useEffect(() => {
    if (!userId || !liveChecks) return;

    const syncProgress = async () => {
      if (!progressRow) {
        // Create new row
        await supabase.from("onboarding_progress").insert({
          home_builder_id: userId,
          ...liveChecks,
        });
        queryClient.invalidateQueries({ queryKey: ["onboarding-progress", userId] });
        return;
      }

      // Check if any field changed
      const fields = [
        "email_verified",
        "company_profile_completed",
        "cost_codes_imported",
        "chart_of_accounts_imported",
        "companies_added",
        "first_project_created",
        "employees_invited",
      ] as const;

      const needsUpdate = fields.some(
        (f) => liveChecks[f] && !progressRow[f]
      );

      if (needsUpdate) {
        const updates: Record<string, boolean> = {};
        for (const f of fields) {
          if (liveChecks[f] && !progressRow[f]) {
            updates[f] = true;
          }
        }
        await supabase
          .from("onboarding_progress")
          .update(updates)
          .eq("home_builder_id", userId);
        queryClient.invalidateQueries({ queryKey: ["onboarding-progress", userId] });
      }
    };

    syncProgress();
  }, [userId, liveChecks, progressRow, queryClient]);

  const merged = liveChecks ?? {
    email_verified: false,
    company_profile_completed: false,
    cost_codes_imported: false,
    chart_of_accounts_imported: false,
    companies_added: false,
    first_project_created: false,
    employees_invited: false,
  };

  const steps: OnboardingStep[] = [
    { key: "email_verified", label: "Verify Email", completed: merged.email_verified },
    { key: "company_profile_completed", label: "Set Up Company Profile", completed: merged.company_profile_completed, link: "/settings?tab=company-profile" },
    { key: "cost_codes_imported", label: "Import Cost Codes", completed: merged.cost_codes_imported, link: "/settings?tab=cost-codes" },
    { key: "chart_of_accounts_imported", label: "Import Chart of Accounts", completed: merged.chart_of_accounts_imported, link: "/settings?tab=chart-of-accounts" },
    { key: "companies_added", label: "Add Subcontractors", completed: merged.companies_added, link: "/settings?tab=companies" },
    { key: "first_project_created", label: "Create First Project", completed: merged.first_project_created, action: "new-project" },
    { key: "employees_invited", label: "Invite Employees", completed: merged.employees_invited, link: "/settings?tab=employees" },
  ];

  const completedCount = steps.filter((s) => s.completed).length;

  return {
    steps,
    completedCount,
    totalCount: steps.length,
    allComplete: completedCount === steps.length,
    isLoading: isLoadingProgress || isLoadingLive,
  };
};
