
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "@/hooks/use-toast";

export interface AccountData {
  code: string;
  name: string;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  description?: string;
  parent_id?: string;
}

export const useAccounts = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('is_active', true)
        .order('code');
      
      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

  const { data: accountingSettings } = useQuery({
    queryKey: ['accounting-settings'],
    queryFn: async () => {
      if (!user) return null;
      
      const { data: userData } = await supabase
        .from('users')
        .select('role, home_builder_id')
        .eq('id', user.id)
        .single();

      const owner_id = userData?.role === 'employee' ? userData.home_builder_id : user.id;

      const { data, error } = await supabase
        .from('accounting_settings')
        .select('*')
        .eq('owner_id', owner_id)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching accounting settings:', error);
        throw error;
      }
      return data;
    },
    enabled: !!user
  });

  const createAccount = useMutation({
    mutationFn: async (accountData: AccountData) => {
      if (!user) throw new Error("User not authenticated");

      const { data: userData } = await supabase
        .from('users')
        .select('role, home_builder_id')
        .eq('id', user.id)
        .single();

      const owner_id = userData?.role === 'employee' ? userData.home_builder_id : user.id;

      const { data, error } = await supabase
        .from('accounts')
        .insert({
          ...accountData,
          owner_id
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast({
        title: "Success",
        description: "Account created successfully",
      });
    },
    onError: (error) => {
      console.error('Error creating account:', error);
      toast({
        title: "Error",
        description: "Failed to create account",
        variant: "destructive",
      });
    }
  });

  const updateAccountingSettings = useMutation({
    mutationFn: async (settings: { ap_account_id?: string; wip_account_id?: string }) => {
      if (!user) throw new Error("User not authenticated");

      const { data: userData } = await supabase
        .from('users')
        .select('role, home_builder_id')
        .eq('id', user.id)
        .single();

      const owner_id = userData?.role === 'employee' ? userData.home_builder_id : user.id;

      const { data, error } = await supabase
        .from('accounting_settings')
        .upsert({
          owner_id,
          ...settings
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting-settings'] });
      toast({
        title: "Success",
        description: "Accounting settings updated successfully",
      });
    },
    onError: (error) => {
      console.error('Error updating settings:', error);
      toast({
        title: "Error",
        description: "Failed to update settings",
        variant: "destructive",
      });
    }
  });

  return {
    accounts,
    accountingSettings,
    isLoading,
    createAccount,
    updateAccountingSettings
  };
};
