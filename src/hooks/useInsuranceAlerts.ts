import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface InsuranceAlert {
  companyId: string;
  companyName: string;
  severity: "error" | "warning";
  status: "missing" | "expired" | "expiring";
  expirationDate?: string;
  daysRemaining?: number;
  insuranceType?: string;
}

export const useInsuranceAlerts = () => {
  const [alerts, setAlerts] = useState<InsuranceAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchInsuranceAlerts = async () => {
      try {
        setIsLoading(true);

        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // 1. Get projects where user is the construction_manager
        const { data: projects } = await supabase
          .from("projects")
          .select("id")
          .eq("construction_manager", user.id);

        if (!projects || projects.length === 0) {
          setAlerts([]);
          return;
        }

        const projectIds = projects.map(p => p.id);

        // 2. Get vendor companies from bills for these projects
        const { data: bills } = await supabase
          .from("bills")
          .select("vendor_id")
          .in("project_id", projectIds);

        const billVendorIds = [...new Set((bills || []).map(b => b.vendor_id).filter(Boolean))];

        // 3. Get schedule tasks and their resources
        const { data: tasks } = await supabase
          .from("project_schedule_tasks")
          .select("resources")
          .in("project_id", projectIds)
          .not("resources", "is", null);

        // Parse resource names from tasks
        const resourceNames = new Set<string>();
        (tasks || []).forEach(task => {
          if (task.resources) {
            // Resources might be stored as JSON array or comma-separated string
            try {
              const parsed = JSON.parse(task.resources);
              if (Array.isArray(parsed)) {
                parsed.forEach((r: any) => {
                  if (typeof r === 'string') resourceNames.add(r.trim());
                  else if (r?.resourceName) resourceNames.add(r.resourceName.trim());
                });
              }
            } catch {
              // Treat as comma-separated string
              task.resources.split(',').forEach(name => resourceNames.add(name.trim()));
            }
          }
        });

        // 4. Match resource names to company representatives to get company IDs
        let scheduleCompanyIds: string[] = [];
        if (resourceNames.size > 0) {
          const { data: reps } = await supabase
            .from("company_representatives")
            .select("company_id, first_name, last_name");

          if (reps) {
            const matchedCompanyIds = reps
              .filter(rep => {
                const fullName = `${rep.first_name} ${rep.last_name || ''}`.trim();
                return resourceNames.has(fullName);
              })
              .map(rep => rep.company_id);
            scheduleCompanyIds = [...new Set(matchedCompanyIds)];
          }
        }

        // Combine all company IDs
        const allCompanyIds = [...new Set([...billVendorIds, ...scheduleCompanyIds])];

        if (allCompanyIds.length === 0) {
          setAlerts([]);
          return;
        }

        // 5. Get companies with their names (only those that require insurance)
        const { data: companies } = await supabase
          .from("companies")
          .select("id, company_name, insurance_required")
          .in("id", allCompanyIds)
          .neq("insurance_required", false);

        // 6. Get insurance records for these companies
        const { data: insurances } = await supabase
          .from("company_insurances")
          .select("company_id, insurance_type, expiration_date")
          .in("company_id", allCompanyIds);

        // 7. Generate alerts
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const thirtyDaysFromNow = new Date(today);
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

        const alertsList: InsuranceAlert[] = [];

        (companies || []).forEach(company => {
          const companyInsurances = (insurances || []).filter(
            ins => ins.company_id === company.id
          );

          if (companyInsurances.length === 0) {
            // No insurance records at all
            alertsList.push({
              companyId: company.id,
              companyName: company.company_name,
              severity: "error",
              status: "missing",
            });
          } else {
            // Check each insurance type
            companyInsurances.forEach(ins => {
              const expDate = new Date(ins.expiration_date);
              expDate.setHours(0, 0, 0, 0);

              if (expDate < today) {
                // Expired
                alertsList.push({
                  companyId: company.id,
                  companyName: company.company_name,
                  severity: "error",
                  status: "expired",
                  expirationDate: ins.expiration_date,
                  insuranceType: ins.insurance_type,
                });
              } else if (expDate <= thirtyDaysFromNow) {
                // Expiring soon
                const daysRemaining = Math.ceil(
                  (expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
                );
                alertsList.push({
                  companyId: company.id,
                  companyName: company.company_name,
                  severity: "warning",
                  status: "expiring",
                  expirationDate: ins.expiration_date,
                  daysRemaining,
                  insuranceType: ins.insurance_type,
                });
              }
            });
          }
        });

        // Sort by severity (errors first) then by company name
        alertsList.sort((a, b) => {
          if (a.severity !== b.severity) {
            return a.severity === "error" ? -1 : 1;
          }
          return a.companyName.localeCompare(b.companyName);
        });

        setAlerts(alertsList);
      } catch (error) {
        console.error("Error fetching insurance alerts:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInsuranceAlerts();
  }, []);

  const errorCount = alerts.filter(a => a.severity === "error").length;
  const warningCount = alerts.filter(a => a.severity === "warning").length;

  return { alerts, isLoading, errorCount, warningCount };
};
