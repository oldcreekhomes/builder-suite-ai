import type { QueryClient } from "@tanstack/react-query";

type ProjectDateUpdates = Record<string, string | null>;

const DATE_QUERY_KEYS = [
  ["projects"],
  ["accounting-manager-bills"],
  ["accountant-project-alerts"],
  ["bill-counts-by-project"],
];

export const updateCachedProjectDateFields = (
  queryClient: QueryClient,
  projectId: string,
  updates: ProjectDateUpdates
) => {
  queryClient.setQueriesData({ queryKey: ["projects"] }, (oldData: unknown) => {
    if (!Array.isArray(oldData)) return oldData;

    return oldData.map((project: any) =>
      project?.id === projectId ? { ...project, ...updates } : project
    );
  });

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
          qbInvoicesPaidDate:
            updates.qb_invoices_paid_date !== undefined
              ? updates.qb_invoices_paid_date
              : project.qbInvoicesPaidDate,
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