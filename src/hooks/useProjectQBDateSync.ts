import type { QueryClient } from "@tanstack/react-query";

type ProjectDateUpdates = Record<string, string | null>;

const DATE_QUERY_KEYS = [
  ["projects"],
  ["accounting-manager-bills"],
  ["bill-counts-by-project"],
];

export const updateCachedProjectDateFields = (
  queryClient: QueryClient,
  projectId: string,
  updates: ProjectDateUpdates
) => {
  // Patch all `projects` query variants (including user-scoped ['projects', userId])
  queryClient.setQueriesData({ queryKey: ["projects"] }, (oldData: unknown) => {
    if (!Array.isArray(oldData)) return oldData;
    return oldData.map((project: any) =>
      project?.id === projectId ? { ...project, ...updates } : project
    );
  });

  // Patch the PM Accounting Alerts cache shape
  queryClient.setQueriesData({ queryKey: ["accounting-manager-bills"] }, (oldData: any) => {
    if (!oldData || !Array.isArray(oldData.projectsWithCounts)) return oldData;
    return {
      ...oldData,
      projectsWithCounts: oldData.projectsWithCounts.map((project: any) => {
        if (project?.projectId !== projectId) return project;
        return {
          ...project,
          qbInvoicesApprovedDate:
            updates.qb_invoices_approved_date !== undefined
              ? updates.qb_invoices_approved_date
              : project.qbInvoicesApprovedDate,
        };
      }),
    };
  });
};

export const refetchProjectDateQueries = (queryClient: QueryClient) => {
  DATE_QUERY_KEYS.forEach((queryKey) => {
    queryClient.invalidateQueries({ queryKey, refetchType: "all" });
  });
};
