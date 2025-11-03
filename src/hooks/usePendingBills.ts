import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface PendingBill {
  id: string;
  file_name: string;
  file_path: string;
  status: string;
  owner_id: string;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
  reviewed_by?: string;
  reviewed_at?: string;
  review_notes?: string;
  extracted_data?: any;
}

export interface PendingBillLine {
  id: string;
  pending_upload_id: string;
  line_number: number;
  line_type: "job_cost" | "expense";
  description?: string;
  account_name?: string;
  cost_code_name?: string;
  project_name?: string;
  account_id?: string;
  cost_code_id?: string;
  project_id?: string;
  quantity: number;
  unit_cost: number;
  amount: number;
  memo?: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export const usePendingBills = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const {
    data: pendingBills,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["pending-bills"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pending_bill_uploads")
        .select("*")
        .in("status", ["extracted", "completed", "reviewing", "error"])
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as PendingBill[];
    },
    refetchInterval: 3000, // Poll every 3 seconds - YES, BRING IT BACK
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData, // THIS prevents flickering
  });

  const usePendingBillLines = (pendingUploadId: string) => {
    return useQuery({
      queryKey: ["pending-bill-lines", pendingUploadId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("pending_bill_lines")
          .select("*")
          .eq("pending_upload_id", pendingUploadId)
          .order("line_number");

        if (error) throw error;
        return data as PendingBillLine[];
      },
      enabled: !!pendingUploadId,
      placeholderData: keepPreviousData,
    });
  };

  const startReview = useMutation({
    mutationFn: async (pendingUploadId: string) => {
      const { error } = await supabase
        .from("pending_bill_uploads")
        .update({ status: "reviewing" })
        .eq("id", pendingUploadId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-bills"] });
    },
  });

  const updateLine = useMutation({
    mutationFn: async ({ lineId, updates }: { lineId: string; updates: Partial<PendingBillLine> }) => {
      const { error } = await supabase.from("pending_bill_lines").update(updates).eq("id", lineId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["pending-bill-lines"],
      });
    },
  });

  const addLine = useMutation({
    mutationFn: async ({
      pendingUploadId,
      lineData,
    }: {
      pendingUploadId: string;
      lineData: Partial<PendingBillLine>;
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: existingLines } = await supabase
        .from("pending_bill_lines")
        .select("line_number")
        .eq("pending_upload_id", pendingUploadId)
        .order("line_number", { ascending: false })
        .limit(1);

      const nextLineNumber = existingLines && existingLines.length > 0 ? existingLines[0].line_number + 1 : 1;

      const { error } = await supabase.from("pending_bill_lines").insert([
        {
          pending_upload_id: pendingUploadId,
          line_number: nextLineNumber,
          owner_id: user.id,
          line_type: lineData.line_type || "expense",
          quantity: lineData.quantity || 1,
          unit_cost: lineData.unit_cost || 0,
          amount: lineData.amount || 0,
          description: lineData.description,
          account_name: lineData.account_name,
          cost_code_name: lineData.cost_code_name,
          project_name: lineData.project_name,
          account_id: lineData.account_id,
          cost_code_id: lineData.cost_code_id,
          project_id: lineData.project_id,
          memo: lineData.memo,
        },
      ]);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["pending-bill-lines", variables.pendingUploadId],
      });
    },
  });

  const deleteLine = useMutation({
    mutationFn: async (lineId: string) => {
      const { error } = await supabase.from("pending_bill_lines").delete().eq("id", lineId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-bill-lines"] });
    },
  });

  const approveBill = useMutation({
    mutationFn: async ({
      pendingUploadId,
      vendorId,
      projectId,
      billDate,
      dueDate,
      referenceNumber,
      terms,
      notes,
      reviewNotes,
    }: {
      pendingUploadId: string;
      vendorId: string;
      projectId: string;
      billDate: string;
      dueDate?: string;
      referenceNumber?: string;
      terms?: string;
      notes?: string;
      reviewNotes?: string;
    }) => {
      const { data, error } = await supabase.rpc("approve_pending_bill", {
        pending_upload_id_param: pendingUploadId,
        vendor_id_param: vendorId,
        project_id_param: projectId,
        bill_date_param: billDate,
        due_date_param: dueDate || null,
        reference_number_param: referenceNumber || null,
        terms_param: terms || null,
        notes_param: notes || null,
        review_notes_param: reviewNotes || null,
      });

      if (error) throw error;

      if (vendorId && terms) {
        await supabase.from("companies").update({ terms }).eq("id", vendorId);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-bills"] });
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      queryClient.invalidateQueries({ queryKey: ["bill-approval-counts"] });
      toast({ title: "Success", description: "Bill approved and created successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: `Failed to approve bill: ${error.message}`, variant: "destructive" });
    },
  });

  const rejectBill = useMutation({
    mutationFn: async ({ pendingUploadId, reviewNotes }: { pendingUploadId: string; reviewNotes?: string }) => {
      const { error } = await supabase.rpc("reject_pending_bill", {
        pending_upload_id_param: pendingUploadId,
        review_notes_param: reviewNotes || null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-bills"] });
      toast({ title: "Success", description: "Bill rejected" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: `Failed to reject bill: ${error.message}`, variant: "destructive" });
    },
  });

  const deletePendingUpload = useMutation({
    mutationFn: async (uploadId: string) => {
      const { data, error } = await supabase.rpc("delete_pending_bill_upload", {
        upload_id_param: uploadId,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-bills"] });
      queryClient.invalidateQueries({ queryKey: ["bill-approval-counts"] });
      toast({ title: "Success", description: "Bill deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: `Failed to delete pending upload: ${error.message}`, variant: "destructive" });
    },
  });

  const batchApproveBills = useMutation({
    mutationFn: async (
      bills: Array<{
        pendingUploadId: string;
        vendorId: string;
        projectId: string;
        billDate: string;
        dueDate?: string;
        referenceNumber?: string;
        terms?: string;
        notes?: string;
        reviewNotes?: string;
      }>,
    ) => {
      const results = [];

      for (const bill of bills) {
        try {
          const { data, error } = await supabase.rpc("approve_pending_bill", {
            pending_upload_id_param: bill.pendingUploadId,
            vendor_id_param: bill.vendorId,
            project_id_param: bill.projectId,
            bill_date_param: bill.billDate,
            due_date_param: bill.dueDate || null,
            reference_number_param: bill.referenceNumber || null,
            terms_param: bill.terms || null,
            notes_param: bill.notes || null,
            review_notes_param: bill.reviewNotes || null,
          });

          if (error) throw error;

          if (bill.vendorId && bill.terms) {
            await supabase.from("companies").update({ terms: bill.terms }).eq("id", bill.vendorId);
          }

          results.push({ success: true, billId: data, pendingUploadId: bill.pendingUploadId });
        } catch (error) {
          results.push({ success: false, error, pendingUploadId: bill.pendingUploadId });
        }
      }

      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-bills"] });
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      queryClient.invalidateQueries({ queryKey: ["bill-approval-counts"] });
    },
  });

  return {
    pendingBills,
    isLoading,
    refetch,
    usePendingBillLines,
    startReview,
    updateLine,
    addLine,
    deleteLine,
    approveBill,
    rejectBill,
    deletePendingUpload,
    batchApproveBills,
  };
};
