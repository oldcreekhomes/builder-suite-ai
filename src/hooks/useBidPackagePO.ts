import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AwardedPO {
  id: string;
  company_id: string;
  po_number: string | null;
  total_amount: number | null;
  status: string | null;
}

export function useBidPackagePO(bidPackageId: string | null | undefined) {
  const { data: awardedPOs = [] } = useQuery({
    queryKey: ['bid-package-pos', bidPackageId],
    queryFn: async (): Promise<AwardedPO[]> => {
      if (!bidPackageId) return [];
      const { data, error } = await supabase
        .from('project_purchase_orders')
        .select('id, company_id, po_number, total_amount, status')
        .eq('bid_package_id', bidPackageId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!bidPackageId,
  });

  return { awardedPOs };
}
