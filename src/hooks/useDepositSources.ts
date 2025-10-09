import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface DepositSource {
  id: string;
  owner_id: string;
  customer_name: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  phone_number?: string;
  email?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface CreateDepositSourceData {
  customer_name: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  phone_number?: string;
  email?: string;
  notes?: string;
}

export function useDepositSources() {
  const [depositSources, setDepositSources] = useState<DepositSource[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchDepositSources = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('deposit_sources')
          .select('*')
          .order('customer_name');

        if (error) throw error;
        setDepositSources(data || []);
      } catch (error) {
        console.error('Error fetching deposit sources:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDepositSources();
  }, [user]);

  const searchDepositSources = (query: string) => {
    if (!query.trim()) return depositSources;
    
    const lowercaseQuery = query.toLowerCase();
    return depositSources.filter(source => 
      source.customer_name.toLowerCase().includes(lowercaseQuery) ||
      (source.email && source.email.toLowerCase().includes(lowercaseQuery)) ||
      (source.phone_number && source.phone_number.includes(query))
    );
  };

  const createDepositSource = useMutation({
    mutationFn: async (data: CreateDepositSourceData) => {
      if (!user) throw new Error('User not authenticated');

      // Get user role to determine owner_id
      const { data: userData } = await supabase
        .from('users')
        .select('role, home_builder_id')
        .eq('id', user.id)
        .single();

      const ownerId = userData?.role === 'employee' && userData?.home_builder_id 
        ? userData.home_builder_id 
        : user.id;

      const { data: newSource, error } = await supabase
        .from('deposit_sources')
        .insert({
          ...data,
          owner_id: ownerId,
        })
        .select()
        .single();

      if (error) throw error;
      return newSource;
    },
    onSuccess: (newSource) => {
      setDepositSources(prev => [...prev, newSource]);
      queryClient.invalidateQueries({ queryKey: ['deposit-sources'] });
      toast.success('Deposit source added successfully');
    },
    onError: (error) => {
      console.error('Error creating deposit source:', error);
      toast.error('Failed to create deposit source');
    },
  });

  return { 
    depositSources, 
    searchDepositSources, 
    loading,
    createDepositSource: createDepositSource.mutate,
    isCreating: createDepositSource.isPending,
  };
}
