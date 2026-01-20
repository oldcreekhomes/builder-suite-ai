import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export interface BillPayment {
  id: string;
  owner_id: string;
  payment_date: string;
  payment_account_id: string;
  vendor_id: string;
  project_id?: string | null;
  total_amount: number;
  memo?: string | null;
  check_number?: string | null;
  reconciled: boolean;
  reconciliation_id?: string | null;
  reconciliation_date?: string | null;
  created_at: string;
  created_by?: string | null;
  // Joined data
  vendor?: { company_name: string };
  allocations?: BillPaymentAllocation[];
}

export interface BillPaymentAllocation {
  id: string;
  bill_payment_id: string;
  bill_id: string;
  amount_allocated: number;
  // Joined data
  bill?: {
    reference_number?: string | null;
    total_amount: number;
  };
}

export const useBillPayments = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Fetch bill payments for a bank account (for reconciliation)
  const useBillPaymentsForReconciliation = (
    bankAccountId: string | null,
    projectId: string | null
  ) => {
    return useQuery({
      queryKey: ['bill-payments-reconciliation', bankAccountId, projectId],
      queryFn: async () => {
        if (!bankAccountId) return [];

        // Build query for bill payments using this payment account
        let query = supabase
          .from('bill_payments')
          .select(`
            id,
            owner_id,
            payment_date,
            payment_account_id,
            vendor_id,
            project_id,
            total_amount,
            memo,
            check_number,
            reconciled,
            reconciliation_id,
            reconciliation_date,
            created_at,
            vendor:companies!bill_payments_vendor_id_fkey(company_name)
          `)
          .eq('payment_account_id', bankAccountId)
          .order('payment_date', { ascending: true });

        if (projectId) {
          query = query.eq('project_id', projectId);
        } else {
          query = query.is('project_id', null);
        }

        const { data, error } = await query;
        if (error) throw error;

        // Fetch allocations for each payment
        if (data && data.length > 0) {
          const paymentIds = data.map(p => p.id);
          
          const { data: allocations, error: allocError } = await supabase
            .from('bill_payment_allocations')
            .select(`
              id,
              bill_payment_id,
              bill_id,
              amount_allocated,
              bill:bills!bill_payment_allocations_bill_id_fkey(reference_number, total_amount)
            `)
            .in('bill_payment_id', paymentIds);

          if (allocError) {
            console.error('Error fetching allocations:', allocError);
          }

          // Map allocations to payments
          const allocationsByPayment = new Map<string, BillPaymentAllocation[]>();
          (allocations || []).forEach(alloc => {
            const existing = allocationsByPayment.get(alloc.bill_payment_id) || [];
            existing.push(alloc as unknown as BillPaymentAllocation);
            allocationsByPayment.set(alloc.bill_payment_id, existing);
          });

          return data.map(payment => ({
            ...payment,
            vendor: payment.vendor as unknown as { company_name: string },
            allocations: allocationsByPayment.get(payment.id) || []
          })) as BillPayment[];
        }

        return data as unknown as BillPayment[];
      },
      enabled: !!bankAccountId,
    });
  };

  // Create a consolidated bill payment
  const createBillPayment = useMutation({
    mutationFn: async ({
      billIds,
      paymentAccountId,
      paymentDate,
      memo,
      checkNumber,
      vendorId,
      projectId,
      totalAmount,
      billAmounts
    }: {
      billIds: string[];
      paymentAccountId: string;
      paymentDate: string;
      memo?: string;
      checkNumber?: string;
      vendorId: string;
      projectId?: string | null;
      totalAmount: number;
      billAmounts: { billId: string; amount: number }[];
    }) => {
      if (!user) throw new Error("User not authenticated");

      // Get owner_id from first bill
      const { data: billData, error: billError } = await supabase
        .from('bills')
        .select('owner_id')
        .eq('id', billIds[0])
        .single();

      if (billError) throw billError;
      const ownerId = billData.owner_id;

      // Create the consolidated bill payment record
      const { data: billPayment, error: paymentError } = await supabase
        .from('bill_payments')
        .insert({
          owner_id: ownerId,
          payment_date: paymentDate,
          payment_account_id: paymentAccountId,
          vendor_id: vendorId,
          project_id: projectId || null,
          total_amount: totalAmount,
          memo: memo || null,
          check_number: checkNumber || null,
          created_by: user.id
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      // Create allocations for each bill
      const allocations = billAmounts.map(ba => ({
        bill_payment_id: billPayment.id,
        bill_id: ba.billId,
        amount_allocated: ba.amount
      }));

      const { error: allocError } = await supabase
        .from('bill_payment_allocations')
        .insert(allocations);

      if (allocError) throw allocError;

      return billPayment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bill-payments-reconciliation'] });
      queryClient.invalidateQueries({ queryKey: ['reconciliation-transactions'] });
    },
    onError: (error: Error) => {
      console.error('Error creating bill payment:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Mark bill payment as reconciled
  const markBillPaymentReconciled = useMutation({
    mutationFn: async ({
      paymentId,
      reconciled,
      reconciliationId,
      reconciliationDate
    }: {
      paymentId: string;
      reconciled: boolean;
      reconciliationId?: string | null;
      reconciliationDate?: string | null;
    }) => {
      const { error } = await supabase
        .from('bill_payments')
        .update({
          reconciled,
          reconciliation_id: reconciled ? reconciliationId : null,
          reconciliation_date: reconciled ? reconciliationDate : null
        })
        .eq('id', paymentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bill-payments-reconciliation'] });
      queryClient.invalidateQueries({ queryKey: ['reconciliation-transactions'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  return {
    useBillPaymentsForReconciliation,
    createBillPayment,
    markBillPaymentReconciled,
  };
};
