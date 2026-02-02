import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface VendorTransaction {
  type: 'Bill' | 'Bill Pmt' | 'Check';
  date: string;
  num: string | null;
  memo: string | null;
  amount: number;
}

export interface VendorData {
  id: string;
  name: string;
  transactions: VendorTransaction[];
  total: number;
}

export interface ProjectVendorData {
  id: string;
  address: string;
  vendors: VendorData[];
  projectTotal: number;
}

export interface VendorPaymentsReportData {
  projects: ProjectVendorData[];
  grandTotal: number;
}

export function useVendorPaymentsReport(asOfDate?: Date) {
  const { user, session } = useAuth();

  // Get effective owner ID (for employees, use home_builder_id)
  const effectiveOwnerId = session?.user?.user_metadata?.user_type === 'employee'
    ? session?.user?.user_metadata?.home_builder_id
    : user?.id;

  return useQuery({
    queryKey: ['vendor-payments-report', effectiveOwnerId, asOfDate?.toISOString()],
    queryFn: async (): Promise<VendorPaymentsReportData> => {
      if (!effectiveOwnerId) {
        return { projects: [], grandTotal: 0 };
      }

      const dateFilter = asOfDate ? asOfDate.toISOString().split('T')[0] : null;

      // 1. Fetch Builder Suite projects
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('id, address, status, accounting_software')
        .eq('accounting_software', 'builder_suite')
        .not('status', 'in', '("Template","Permanently Closed")')
        .order('address');

      if (projectsError) {
        console.error('Error fetching projects:', projectsError);
        throw projectsError;
      }

      if (!projects || projects.length === 0) {
        return { projects: [], grandTotal: 0 };
      }

      const projectIds = projects.map(p => p.id);

      // 2. Fetch Bills (posted/paid, non-reversal, not reversed)
      let billsQuery = supabase
        .from('bills')
        .select(`
          id,
          project_id,
          vendor_id,
          bill_date,
          reference_number,
          notes,
          total_amount,
          is_reversal,
          reversed_by_id,
          companies!bills_vendor_id_fkey (
            id,
            company_name
          )
        `)
        .in('project_id', projectIds)
        .in('status', ['posted', 'paid'])
        .eq('is_reversal', false)
        .is('reversed_by_id', null);

      if (dateFilter) {
        billsQuery = billsQuery.lte('bill_date', dateFilter);
      }

      const { data: bills, error: billsError } = await billsQuery;
      if (billsError) {
        console.error('Error fetching bills:', billsError);
        throw billsError;
      }

      // 3. Fetch Bill Payments
      let paymentsQuery = supabase
        .from('bill_payments')
        .select(`
          id,
          project_id,
          vendor_id,
          payment_date,
          check_number,
          memo,
          total_amount,
          companies!bill_payments_vendor_id_fkey (
            id,
            company_name
          )
        `)
        .in('project_id', projectIds);

      if (dateFilter) {
        paymentsQuery = paymentsQuery.lte('payment_date', dateFilter);
      }

      const { data: billPayments, error: paymentsError } = await paymentsQuery;
      if (paymentsError) {
        console.error('Error fetching bill payments:', paymentsError);
        throw paymentsError;
      }

      // 4. Fetch Checks (direct payments)
      let checksQuery = supabase
        .from('checks')
        .select(`
          id,
          project_id,
          pay_to,
          check_date,
          check_number,
          memo,
          amount,
          is_reversal,
          reversed_by_id
        `)
        .in('project_id', projectIds)
        .or('is_reversal.is.null,is_reversal.eq.false')
        .is('reversed_by_id', null);

      if (dateFilter) {
        checksQuery = checksQuery.lte('check_date', dateFilter);
      }

      const { data: checks, error: checksError } = await checksQuery;
      if (checksError) {
        console.error('Error fetching checks:', checksError);
        throw checksError;
      }

      // 5. Build the report structure
      const projectMap = new Map<string, ProjectVendorData>();

      // Initialize project map
      for (const project of projects) {
        projectMap.set(project.id, {
          id: project.id,
          address: project.address,
          vendors: [],
          projectTotal: 0,
        });
      }

      // Helper to get or create vendor in project
      const getOrCreateVendor = (projectId: string, vendorId: string, vendorName: string): VendorData => {
        const project = projectMap.get(projectId);
        if (!project) throw new Error(`Project ${projectId} not found`);

        let vendor = project.vendors.find(v => v.id === vendorId);
        if (!vendor) {
          vendor = {
            id: vendorId,
            name: vendorName,
            transactions: [],
            total: 0,
          };
          project.vendors.push(vendor);
        }
        return vendor;
      };

      // Process Bills
      for (const bill of bills || []) {
        if (!bill.project_id || !bill.vendor_id) continue;
        const vendorName = (bill.companies as any)?.company_name || 'Unknown Vendor';
        const vendor = getOrCreateVendor(bill.project_id, bill.vendor_id, vendorName);
        vendor.transactions.push({
          type: 'Bill',
          date: bill.bill_date,
          num: bill.reference_number,
          memo: bill.notes,
          amount: bill.total_amount,
        });
        vendor.total += bill.total_amount;
      }

      // Process Bill Payments
      for (const payment of billPayments || []) {
        if (!payment.project_id || !payment.vendor_id) continue;
        const vendorName = (payment.companies as any)?.company_name || 'Unknown Vendor';
        const vendor = getOrCreateVendor(payment.project_id, payment.vendor_id, vendorName);
        vendor.transactions.push({
          type: 'Bill Pmt',
          date: payment.payment_date,
          num: payment.check_number,
          memo: payment.memo,
          amount: payment.total_amount,
        });
        vendor.total += payment.total_amount;
      }

      // Process Checks - group by pay_to (vendor name string)
      for (const check of checks || []) {
        if (!check.project_id || !check.pay_to) continue;
        // For checks, we use pay_to as both ID and name since there's no vendor_id
        const vendor = getOrCreateVendor(check.project_id, `check_${check.pay_to}`, check.pay_to);
        vendor.transactions.push({
          type: 'Check',
          date: check.check_date,
          num: check.check_number,
          memo: check.memo,
          amount: check.amount,
        });
        vendor.total += check.amount;
      }

      // Sort transactions within each vendor by date
      for (const project of projectMap.values()) {
        for (const vendor of project.vendors) {
          vendor.transactions.sort((a, b) => 
            new Date(a.date).getTime() - new Date(b.date).getTime()
          );
        }
        // Sort vendors alphabetically
        project.vendors.sort((a, b) => a.name.localeCompare(b.name));
        // Calculate project total
        project.projectTotal = project.vendors.reduce((sum, v) => sum + v.total, 0);
      }

      // Convert to array and filter out projects with no transactions
      const projectsArray = Array.from(projectMap.values())
        .filter(p => p.vendors.length > 0)
        .sort((a, b) => a.address.localeCompare(b.address));

      const grandTotal = projectsArray.reduce((sum, p) => sum + p.projectTotal, 0);

      return {
        projects: projectsArray,
        grandTotal,
      };
    },
    enabled: !!effectiveOwnerId,
    staleTime: 5 * 60 * 1000,
  });
}
