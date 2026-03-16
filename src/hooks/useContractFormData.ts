import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

const TEMPLATE_KEY = "subcontractor-contract-form-data";

export interface ContractFormData {
  fields: { [key: string]: string };
  lineItems: { letter: string; description: string; amount: number }[];
}

export const useContractFormData = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["contract-form-data"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("template_content" as any)
        .select("*")
        .eq("template_key", TEMPLATE_KEY)
        .maybeSingle();

      if (error) {
        console.error("Error fetching contract form data:", error);
        return null;
      }
      return data;
    },
    enabled: !!user,
  });

  const saveMutation = useMutation({
    mutationFn: async (content: ContractFormData) => {
      if (!user) throw new Error("Not authenticated");

      const { data: userData } = await supabase
        .from("users")
        .select("role, home_builder_id")
        .eq("id", user.id)
        .single();

      const ownerId = userData?.role === "owner" ? user.id : userData?.home_builder_id;
      if (!ownerId) throw new Error("Could not determine owner");

      const { error } = await supabase
        .from("template_content" as any)
        .upsert(
          {
            owner_id: ownerId,
            template_key: TEMPLATE_KEY,
            content: content,
            updated_by: user.id,
          },
          { onConflict: "owner_id,template_key" }
        );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contract-form-data"] });
    },
    onError: (error) => {
      console.error("Error saving contract form data:", error);
    },
  });

  const savedContent = (data as any)?.content as ContractFormData | undefined;

  return {
    savedData: savedContent ?? null,
    isLoading,
    save: saveMutation.mutate,
    isSaving: saveMutation.isPending,
  };
};
