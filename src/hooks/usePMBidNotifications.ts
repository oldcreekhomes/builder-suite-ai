import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface ProjectBidCounts {
  projectId: string;
  projectAddress: string;
  willBidCount: number;
  bidCount: number;
  totalCount: number;
}

export interface BidNotification {
  bidId: string;
  companyId: string;
  companyName: string;
  bidPackageId: string;
  bidPackageName: string;
  costCodeName: string;
  projectId: string;
  projectAddress: string;
  bidStatus: string;
  price: number | null;
  proposals: string[] | null;
  updatedAt: string;
}

export function usePMBidNotifications() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["pm-bid-notifications", user?.id],
    queryFn: async () => {
      if (!user?.id) return { projectCounts: [], notifications: [] };

      // First get the projects where the current user is the construction_manager
      const { data: projects, error: projectsError } = await supabase
        .from("projects")
        .select("id, address")
        .eq("construction_manager", user.id);

      if (projectsError) throw projectsError;
      if (!projects || projects.length === 0) {
        return { projectCounts: [], notifications: [] };
      }

      const projectIds = projects.map((p) => p.id);
      const projectMap = new Map(projects.map((p) => [p.id, p.address]));

      // Get bid packages for those projects
      const { data: bidPackages, error: packagesError } = await supabase
        .from("project_bid_packages")
        .select(`
          id,
          project_id,
          cost_codes(id, name)
        `)
        .in("project_id", projectIds);

      if (packagesError) throw packagesError;
      if (!bidPackages || bidPackages.length === 0) {
        return { projectCounts: [], notifications: [] };
      }

      const packageIds = bidPackages.map((bp) => bp.id);
      const packageMap = new Map(
        bidPackages.map((bp) => [
          bp.id,
          {
            projectId: bp.project_id,
            costCodeName: (bp.cost_codes as any)?.name || "Unknown",
          },
        ])
      );

      // Get bids that need notifications (unacknowledged will_bid or submitted)
      const { data: bids, error: bidsError } = await supabase
        .from("project_bids")
        .select(`
          id,
          bid_package_id,
          company_id,
          bid_status,
          price,
          proposals,
          will_bid_acknowledged_by,
          bid_acknowledged_by,
          updated_at,
          companies(id, company_name)
        `)
        .in("bid_package_id", packageIds)
        .or(
          `and(bid_status.eq.will_bid,will_bid_acknowledged_by.is.null),and(bid_status.eq.submitted,bid_acknowledged_by.is.null)`
        );

      if (bidsError) throw bidsError;

      // Build notifications list
      const notifications: BidNotification[] = (bids || []).map((bid) => {
        const packageInfo = packageMap.get(bid.bid_package_id);
        const projectAddress = packageInfo
          ? projectMap.get(packageInfo.projectId) || "Unknown"
          : "Unknown";

        return {
          bidId: bid.id,
          companyId: bid.company_id,
          companyName: (bid.companies as any)?.company_name || "Unknown",
          bidPackageId: bid.bid_package_id,
          bidPackageName: packageInfo?.costCodeName || "Unknown",
          costCodeName: packageInfo?.costCodeName || "Unknown",
          projectId: packageInfo?.projectId || "",
          projectAddress,
          bidStatus: bid.bid_status,
          price: bid.price,
          proposals: bid.proposals as string[] | null,
          updatedAt: bid.updated_at,
        };
      });

      // Aggregate counts per project
      const projectCountsMap = new Map<string, ProjectBidCounts>();

      for (const project of projects) {
        projectCountsMap.set(project.id, {
          projectId: project.id,
          projectAddress: project.address || "Unknown",
          willBidCount: 0,
          bidCount: 0,
          totalCount: 0,
        });
      }

      for (const notification of notifications) {
        const counts = projectCountsMap.get(notification.projectId);
        if (counts) {
          if (notification.bidStatus === "will_bid") {
            counts.willBidCount++;
          } else if (notification.bidStatus === "submitted") {
            counts.bidCount++;
          }
          counts.totalCount = counts.willBidCount + counts.bidCount;
        }
      }

      const projectCounts = Array.from(projectCountsMap.values()).filter(
        (p) => p.totalCount > 0
      );

      return { projectCounts, notifications };
    },
    enabled: !!user?.id,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}
